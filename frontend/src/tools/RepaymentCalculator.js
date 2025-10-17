import React, { useState, useEffect } from 'react';
import { Calculator, Download, DollarSign, Calendar, Percent, TrendingUp, FileSpreadsheet, FileJson } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ReactECharts from 'echarts-for-react';
import * as XLSX from 'xlsx';

/**
 * Repayment Schedule Calculator
 * Calculate loan repayment schedules with amortization
 */
function RepaymentCalculator({ tab, tabs, setTabs }) {
  const [loanAmount, setLoanAmount] = useState(tab.data?.loanAmount || 100000);
  const [interestRate, setInterestRate] = useState(tab.data?.interestRate || 5.5);
  const [loanTerm, setLoanTerm] = useState(tab.data?.loanTerm || 12);
  const [termUnit, setTermUnit] = useState(tab.data?.termUnit || 'months'); // months or years
  const [paymentFrequency, setPaymentFrequency] = useState(tab.data?.paymentFrequency || 'monthly');
  const [startDate, setStartDate] = useState(tab.data?.startDate || new Date().toISOString().split('T')[0]);
  
  const [schedule, setSchedule] = useState([]);
  const [summary, setSummary] = useState(null);

  // Update tab data
  useEffect(() => {
    const updatedTabs = tabs.map(t => 
      t.tabId === tab.tabId 
        ? { ...t, data: { loanAmount, interestRate, loanTerm, termUnit, paymentFrequency, startDate } }
        : t
    );
    setTabs(updatedTabs);
  }, [loanAmount, interestRate, loanTerm, termUnit, paymentFrequency, startDate]);

  // Calculate repayment schedule
  const calculateSchedule = () => {
    try {
      const principal = parseFloat(loanAmount);
      const annualRate = parseFloat(interestRate) / 100;
      let totalPeriods = parseInt(loanTerm);
      
      // Convert term to months
      if (termUnit === 'years') {
        totalPeriods = totalPeriods * 12;
      }

      // Calculate periods per year based on frequency
      let periodsPerYear = 12;
      if (paymentFrequency === 'weekly') periodsPerYear = 52;
      else if (paymentFrequency === 'biweekly') periodsPerYear = 26;
      else if (paymentFrequency === 'quarterly') periodsPerYear = 4;
      else if (paymentFrequency === 'annually') periodsPerYear = 1;

      // Adjust total periods based on frequency
      const adjustedPeriods = Math.round(totalPeriods * (periodsPerYear / 12));
      
      // Calculate periodic interest rate
      const periodicRate = annualRate / periodsPerYear;

      // Calculate payment using amortization formula
      // PMT = P * [r(1+r)^n] / [(1+r)^n - 1]
      const payment = principal * 
        (periodicRate * Math.pow(1 + periodicRate, adjustedPeriods)) / 
        (Math.pow(1 + periodicRate, adjustedPeriods) - 1);

      // Generate schedule
      let balance = principal;
      const scheduleData = [];
      let totalInterest = 0;
      let totalPrincipal = 0;
      const start = new Date(startDate);

      for (let i = 1; i <= adjustedPeriods; i++) {
        const interestPayment = balance * periodicRate;
        const principalPayment = payment - interestPayment;
        balance = balance - principalPayment;

        // Handle final payment rounding
        if (i === adjustedPeriods && balance < 0.01) {
          balance = 0;
        }

        totalInterest += interestPayment;
        totalPrincipal += principalPayment;

        // Calculate payment date
        let paymentDate = new Date(start);
        if (paymentFrequency === 'monthly') {
          paymentDate.setMonth(start.getMonth() + i);
        } else if (paymentFrequency === 'weekly') {
          paymentDate.setDate(start.getDate() + (i * 7));
        } else if (paymentFrequency === 'biweekly') {
          paymentDate.setDate(start.getDate() + (i * 14));
        } else if (paymentFrequency === 'quarterly') {
          paymentDate.setMonth(start.getMonth() + (i * 3));
        } else if (paymentFrequency === 'annually') {
          paymentDate.setFullYear(start.getFullYear() + i);
        }

        scheduleData.push({
          period: i,
          date: paymentDate.toISOString().split('T')[0],
          payment: payment,
          principal: principalPayment,
          interest: interestPayment,
          balance: Math.max(0, balance)
        });
      }

      setSchedule(scheduleData);
      setSummary({
        totalPayment: payment * adjustedPeriods,
        totalPrincipal: principal,
        totalInterest: totalInterest,
        monthlyPayment: payment,
        numberOfPayments: adjustedPeriods
      });

      toast.success('Schedule calculated');
    } catch (err) {
      toast.error('Calculation error: ' + err.message);
    }
  };

  // Format currency in INR
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Export to Excel
  const exportToExcel = () => {
    const worksheetData = [
      ['Loan Repayment Schedule'],
      [''],
      ['Loan Amount:', formatCurrency(summary.totalPrincipal)],
      ['Interest Rate:', `${interestRate}%`],
      ['Loan Term:', `${loanTerm} ${termUnit}`],
      ['Payment Frequency:', paymentFrequency],
      ['Payment Amount:', formatCurrency(summary.monthlyPayment)],
      ['Total Interest:', formatCurrency(summary.totalInterest)],
      ['Total Payment:', formatCurrency(summary.totalPayment)],
      [''],
      ['Period', 'Date', 'Payment', 'Principal', 'Interest', 'Balance'],
      ...schedule.map(row => [
        row.period,
        row.date,
        row.payment.toFixed(2),
        row.principal.toFixed(2),
        row.interest.toFixed(2),
        row.balance.toFixed(2)
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Repayment Schedule');
    
    XLSX.writeFile(workbook, `repayment-schedule-${Date.now()}.xlsx`);
    toast.success('Excel file downloaded');
  };

  // Export to JSON
  const exportToJSON = () => {
    const exportData = {
      loanDetails: {
        loanAmount: parseFloat(loanAmount),
        interestRate: parseFloat(interestRate),
        loanTerm: parseInt(loanTerm),
        termUnit,
        paymentFrequency,
        startDate
      },
      summary: {
        paymentAmount: summary.monthlyPayment,
        totalPayments: summary.numberOfPayments,
        totalPrincipal: summary.totalPrincipal,
        totalInterest: summary.totalInterest,
        totalPayment: summary.totalPayment
      },
      schedule: schedule.map(row => ({
        period: row.period,
        date: row.date,
        payment: parseFloat(row.payment.toFixed(2)),
        principal: parseFloat(row.principal.toFixed(2)),
        interest: parseFloat(row.interest.toFixed(2)),
        balance: parseFloat(row.balance.toFixed(2))
      })),
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repayment-schedule-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('JSON file downloaded');
  };

  // Chart configuration with modern color scheme
  const getChartOption = () => {
    if (!schedule.length) return {};

    // Get computed CSS variables for theme colors
    const getThemeColor = (varName) => {
      if (typeof window !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      }
      return '#000';
    };

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Principal vs Interest Over Time',
        left: 'center',
        top: 10,
        textStyle: {
          color: getThemeColor('--text-primary') || '#1f2937',
          fontSize: 16,
          fontWeight: 600,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#1f2937',
          fontSize: 13,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        padding: 12,
        formatter: (params) => {
          const period = params[0].axisValue;
          let result = `<div style="font-weight: 600; margin-bottom: 8px; color: #111827;">Period ${period}</div>`;
          params.forEach(param => {
            result += `<div style="margin: 4px 0;">${param.marker} <span style="font-weight: 500;">${param.seriesName}:</span> <span style="font-weight: 600;">${formatCurrency(param.value)}</span></div>`;
          });
          return result;
        }
      },
      legend: {
        data: ['Principal', 'Interest', 'Balance'],
        top: 40,
        textStyle: {
          color: getThemeColor('--text-primary') || '#1f2937',
          fontSize: 13,
          fontWeight: 500,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        itemGap: 20
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '5%',
        top: '80px',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: schedule.map(row => row.period),
        name: 'Payment Period',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: {
          color: getThemeColor('--text-secondary') || '#6b7280',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        axisLabel: {
          color: getThemeColor('--text-secondary') || '#6b7280',
          fontSize: 11,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: 'Amount (₹)',
        nameTextStyle: {
          color: getThemeColor('--text-secondary') || '#6b7280',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb'
          }
        },
        axisLabel: {
          color: getThemeColor('--text-secondary') || '#6b7280',
          fontSize: 11,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          formatter: (value) => {
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value}`;
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: 'Principal',
          type: 'line',
          data: schedule.map(row => row.principal.toFixed(2)),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            shadowColor: 'rgba(16, 185, 129, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 5
          },
          itemStyle: { 
            color: '#10b981',
            borderColor: '#fff',
            borderWidth: 2
          },
          areaStyle: { 
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
              ]
            }
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(16, 185, 129, 0.5)'
            }
          }
        },
        {
          name: 'Interest',
          type: 'line',
          data: schedule.map(row => row.interest.toFixed(2)),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            shadowColor: 'rgba(239, 68, 68, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 5
          },
          itemStyle: { 
            color: '#ef4444',
            borderColor: '#fff',
            borderWidth: 2
          },
          areaStyle: { 
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(239, 68, 68, 0.4)' },
                { offset: 1, color: 'rgba(239, 68, 68, 0.05)' }
              ]
            }
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(239, 68, 68, 0.5)'
            }
          }
        },
        {
          name: 'Balance',
          type: 'line',
          data: schedule.map(row => row.balance.toFixed(2)),
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            type: 'solid',
            shadowColor: 'rgba(59, 130, 246, 0.3)',
            shadowBlur: 10,
            shadowOffsetY: 5
          },
          itemStyle: { 
            color: '#3b82f6',
            borderColor: '#fff',
            borderWidth: 2
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(59, 130, 246, 0.5)'
            }
          }
        }
      ]
    };
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Repayment Schedule Calculator</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Calculate loan amortization and repayment schedules
          </p>
        </div>
        <div className="flex gap-2">
          {schedule.length > 0 && (
            <>
              <Button onClick={exportToExcel} size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Export Excel
              </Button>
              <Button onClick={exportToJSON} size="sm" variant="outline" className="text-blue-600 hover:text-blue-700">
                <FileJson className="w-4 h-4 mr-2" />
                Export JSON
              </Button>
            </>
          )}
          <Button onClick={calculateSchedule} size="sm" className="bg-[var(--accent-primary)] text-white">
            <Calculator className="w-4 h-4 mr-2" />
            Calculate
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Panel - Input */}
        <div className="w-96 flex flex-col gap-4">
          {/* Loan Amount */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Loan Amount
            </label>
            <input
              type="number"
              value={loanAmount}
              onChange={(e) => setLoanAmount(e.target.value)}
              className="w-full px-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] text-lg font-semibold"
              min="0"
              step="1000"
            />
          </div>

          {/* Interest Rate */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <Percent className="w-4 h-4 inline mr-1" />
              Annual Interest Rate (%)
            </label>
            <input
              type="number"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full px-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] text-lg font-semibold"
              min="0"
              max="100"
              step="0.1"
            />
          </div>

          {/* Loan Term */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Loan Term
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                value={loanTerm}
                onChange={(e) => setLoanTerm(e.target.value)}
                className="flex-1 px-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)] text-lg font-semibold"
                min="1"
              />
              <select
                value={termUnit}
                onChange={(e) => setTermUnit(e.target.value)}
                className="px-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
              >
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
            </div>
          </div>

          {/* Payment Frequency */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Payment Frequency
            </label>
            <select
              value={paymentFrequency}
              onChange={(e) => setPaymentFrequency(e.target.value)}
              className="w-full px-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            >
              <option value="weekly">Weekly</option>
              <option value="biweekly">Bi-weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annually">Annually</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border rounded bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-primary)]"
            />
          </div>

          {/* Summary */}
          {summary && (
            <div className="mt-4 p-4 border-2 border-[var(--accent-primary)] rounded-lg bg-[var(--accent-primary)]/5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Payment Amount:</span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {formatCurrency(summary.monthlyPayment)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Total Payments:</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {summary.numberOfPayments}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Total Principal:</span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {formatCurrency(summary.totalPrincipal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-[var(--text-secondary)]">Total Interest:</span>
                  <span className="text-sm font-semibold text-red-500">
                    {formatCurrency(summary.totalInterest)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[var(--border-primary)]">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">Total Payment:</span>
                  <span className="text-lg font-bold text-[var(--accent-primary)]">
                    {formatCurrency(summary.totalPayment)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Chart & Schedule */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Chart */}
          {schedule.length > 0 && (
            <div className="h-80 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] p-4">
              <ReactECharts 
                option={getChartOption()} 
                style={{ height: '100%', width: '100%' }}
                opts={{ renderer: 'svg' }}
              />
            </div>
          )}

          {/* Schedule Table */}
          <div className="flex-1 flex flex-col border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] overflow-hidden">
            <div className="p-3 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Amortization Schedule {schedule.length > 0 && `(${schedule.length} payments)`}
              </h3>
            </div>
            
            {schedule.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <TrendingUp className="w-16 h-16 text-[var(--text-secondary)] mb-4" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                No Schedule Generated
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                Enter loan details and click "Calculate" to generate the repayment schedule
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)]">#</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-[var(--text-primary)]">Date</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">Payment</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">Principal</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">Interest</th>
                    <th className="px-3 py-2 text-right text-xs font-semibold text-[var(--text-primary)]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, idx) => (
                    <tr 
                      key={idx}
                      className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
                    >
                      <td className="px-3 py-2 text-[var(--text-secondary)]">{row.period}</td>
                      <td className="px-3 py-2 text-[var(--text-primary)] font-mono text-xs">{row.date}</td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)] font-semibold">
                        {formatCurrency(row.payment)}
                      </td>
                      <td className="px-3 py-2 text-right text-green-600 font-medium">
                        {formatCurrency(row.principal)}
                      </td>
                      <td className="px-3 py-2 text-right text-red-500 font-medium">
                        {formatCurrency(row.interest)}
                      </td>
                      <td className="px-3 py-2 text-right text-[var(--text-primary)] font-bold">
                        {formatCurrency(row.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RepaymentCalculator;
