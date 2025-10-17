import React, { useState, useEffect } from 'react';
import { Calculator, Download, DollarSign, Calendar, Percent, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Period', 'Date', 'Payment', 'Principal', 'Interest', 'Balance'];
    const rows = schedule.map(row => [
      row.period,
      row.date,
      row.payment.toFixed(2),
      row.principal.toFixed(2),
      row.interest.toFixed(2),
      row.balance.toFixed(2)
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `repayment-schedule-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Schedule exported');
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
            <Button onClick={exportToCSV} size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
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

        {/* Right Panel - Schedule Table */}
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
  );
}

export default RepaymentCalculator;
