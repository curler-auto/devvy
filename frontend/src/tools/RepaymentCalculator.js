import React, { useState, useEffect } from 'react';
import { Calculator, Download, DollarSign, Calendar, Percent, TrendingUp, FileSpreadsheet, FileJson, BarChart3, Table2 } from 'lucide-react';
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
  const [showChart, setShowChart] = useState(false); // Toggle between chart and summary

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

  // Chart configuration with subtle, minimalistic design
  const getChartOption = () => {
    if (!schedule.length) return {};

    const getThemeColor = (varName) => {
      if (typeof window !== 'undefined') {
        return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
      }
      return '#000';
    };

    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Amortization Trend',
        left: 'center',
        top: 5,
        textStyle: {
          color: getThemeColor('--text-primary') || '#374151',
          fontSize: 14,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        }
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255, 255, 255, 0.96)',
        borderColor: '#e5e7eb',
        borderWidth: 1,
        textStyle: {
          color: '#4b5563',
          fontSize: 12,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        padding: 10,
        formatter: (params) => {
          const period = params[0].axisValue;
          let result = `<div style="font-weight: 500; margin-bottom: 6px; color: #1f2937; font-size: 11px;">Period ${period}</div>`;
          params.forEach(param => {
            result += `<div style="margin: 3px 0; font-size: 11px;">${param.marker} ${param.seriesName}: ${formatCurrency(param.value)}</div>`;
          });
          return result;
        }
      },
      legend: {
        data: ['Principal', 'Interest', 'Balance'],
        top: 28,
        textStyle: {
          color: getThemeColor('--text-secondary') || '#6b7280',
          fontSize: 11,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        itemGap: 16,
        itemWidth: 20,
        itemHeight: 10
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '8%',
        top: '65px',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: schedule.map(row => row.period),
        name: 'Period',
        nameLocation: 'middle',
        nameGap: 25,
        nameTextStyle: {
          color: getThemeColor('--text-secondary') || '#9ca3af',
          fontSize: 11,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        axisLine: {
          lineStyle: {
            color: '#e5e7eb',
            width: 1
          }
        },
        axisLabel: {
          color: getThemeColor('--text-secondary') || '#9ca3af',
          fontSize: 10,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: 'Amount (₹)',
        nameTextStyle: {
          color: getThemeColor('--text-secondary') || '#9ca3af',
          fontSize: 11,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
        },
        axisLine: {
          show: false
        },
        axisLabel: {
          color: getThemeColor('--text-secondary') || '#9ca3af',
          fontSize: 10,
          fontWeight: 400,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          formatter: (value) => {
            if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
            if (value >= 1000) return `₹${(value / 1000).toFixed(1)}K`;
            return `₹${value}`;
          }
        },
        splitLine: {
          lineStyle: {
            color: '#f3f4f6',
            type: 'solid',
            width: 1
          }
        }
      },
      series: [
        {
          name: 'Principal',
          type: 'line',
          data: schedule.map(row => row.principal.toFixed(2)),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            color: '#8b5cf6'
          },
          areaStyle: { 
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(139, 92, 246, 0.15)' },
                { offset: 1, color: 'rgba(139, 92, 246, 0.02)' }
              ]
            }
          }
        },
        {
          name: 'Interest',
          type: 'line',
          data: schedule.map(row => row.interest.toFixed(2)),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            color: '#f59e0b'
          },
          areaStyle: { 
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(245, 158, 11, 0.15)' },
                { offset: 1, color: 'rgba(245, 158, 11, 0.02)' }
              ]
            }
          }
        },
        {
          name: 'Balance',
          type: 'line',
          data: schedule.map(row => row.balance.toFixed(2)),
          smooth: true,
          symbol: 'none',
          lineStyle: {
            width: 2,
            color: '#6366f1',
            type: 'solid'
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
        <div className="w-80 flex flex-col gap-3">
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

        </div>

        {/* Right Panel - Summary/Chart + Table */}
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          {/* Summary or Chart - Flippable */}
          {summary && (
            <div className="h-64 border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] overflow-hidden">
              {!showChart ? (
                /* Summary View */
                <div className="h-full p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-normal text-[var(--text-secondary)]">Loan Summary</h3>
                    <button
                      onClick={() => setShowChart(true)}
                      className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                      title="Show Chart"
                    >
                      <BarChart3 className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-normal text-[var(--text-secondary)]">Payment Amount</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {formatCurrency(summary.monthlyPayment)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-normal text-[var(--text-secondary)]">Total Payments</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {summary.numberOfPayments}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-normal text-[var(--text-secondary)]">Total Principal</span>
                      <span className="text-sm font-medium text-[var(--text-primary)]">
                        {formatCurrency(summary.totalPrincipal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-normal text-[var(--text-secondary)]">Total Interest</span>
                      <span className="text-sm font-medium text-amber-600">
                        {formatCurrency(summary.totalInterest)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-[var(--border-primary)]">
                      <span className="text-xs font-medium text-[var(--text-primary)]">Total Payment</span>
                      <span className="text-base font-medium text-[var(--text-primary)]">
                        {formatCurrency(summary.totalPayment)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Chart View */
                <div className="h-full p-3">
                  <div className="flex items-center justify-end mb-2">
                    <button
                      onClick={() => setShowChart(false)}
                      className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
                      title="Show Summary"
                    >
                      <Table2 className="w-4 h-4 text-[var(--text-secondary)]" />
                    </button>
                  </div>
                  <div className="h-[calc(100%-40px)]">
                    <ReactECharts 
                      option={getChartOption()} 
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'svg' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Schedule Table */}
          <div className="flex-1 flex flex-col border border-[var(--border-primary)] rounded-lg bg-[var(--bg-secondary)] overflow-hidden">
            <div className="px-4 py-2.5 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
              <h3 className="text-xs font-normal text-[var(--text-secondary)]">
                Payment Schedule {schedule.length > 0 && `· ${schedule.length} payments`}
              </h3>
            </div>
            
            {schedule.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <TrendingUp className="w-12 h-12 text-[var(--text-secondary)] opacity-40 mb-3" />
              <h3 className="text-sm font-normal text-[var(--text-primary)] mb-1">
                No Schedule Generated
              </h3>
              <p className="text-xs font-normal text-[var(--text-secondary)]">
                Enter loan details and click "Calculate"
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)]">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-normal text-[var(--text-secondary)]">#</th>
                    <th className="px-3 py-2 text-left text-xs font-normal text-[var(--text-secondary)]">Date</th>
                    <th className="px-3 py-2 text-right text-xs font-normal text-[var(--text-secondary)]">Payment</th>
                    <th className="px-3 py-2 text-right text-xs font-normal text-[var(--text-secondary)]">Principal</th>
                    <th className="px-3 py-2 text-right text-xs font-normal text-[var(--text-secondary)]">Interest</th>
                    <th className="px-3 py-2 text-right text-xs font-normal text-[var(--text-secondary)]">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((row, idx) => (
                    <tr 
                      key={idx}
                      className="border-b border-[var(--border-primary)] hover:bg-[var(--bg-tertiary)]/50 transition-colors"
                    >
                      <td className="px-3 py-2 text-xs text-[var(--text-secondary)]">{row.period}</td>
                      <td className="px-3 py-2 text-xs text-[var(--text-primary)] font-mono">{row.date}</td>
                      <td className="px-3 py-2 text-right text-xs font-normal text-[var(--text-primary)]">
                        {formatCurrency(row.payment)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-normal text-violet-600">
                        {formatCurrency(row.principal)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-normal text-amber-600">
                        {formatCurrency(row.interest)}
                      </td>
                      <td className="px-3 py-2 text-right text-xs font-medium text-[var(--text-primary)]">
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
