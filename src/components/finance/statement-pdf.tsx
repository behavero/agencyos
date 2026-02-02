import React from 'react'
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

// Define styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 30,
    borderBottom: '2px solid #b026ff',
    paddingBottom: 10,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#b026ff',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#666',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    marginTop: 20,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottom: '1px solid #e0e0e0',
  },
  label: {
    fontSize: 11,
    color: '#666',
  },
  value: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#000',
  },
  lineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingLeft: 10,
  },
  lineItemLabel: {
    fontSize: 11,
    color: '#333',
    flex: 1,
  },
  lineItemValue: {
    fontSize: 11,
    color: '#000',
    fontWeight: 'bold',
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    paddingTop: 15,
    borderTop: '2px solid #b026ff',
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#b026ff',
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTop: '1px solid #e0e0e0',
  },
  footerText: {
    fontSize: 9,
    color: '#999',
    textAlign: 'center',
  },
  paymentInfo: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f9f9f9',
    borderRadius: 5,
  },
  paymentTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  paymentDetails: {
    fontSize: 10,
    color: '#666',
    marginBottom: 5,
  },
})

interface StatementPDFProps {
  paycheck: {
    profile_name: string
    role: string
    pay_model: string
    hours_worked: number
    hourly_rate: number
    hourly_pay: number
    sales_generated: number
    commission_percent: number
    commission_pay: number
    bonus: number
    deductions: number
    total_payout: number
    currency: string
    payment_method?: string
    payment_details?: Record<string, any>
  }
  period: {
    start: string
    end: string
  }
  runId: string
}

export const StatementPDF: React.FC<StatementPDFProps> = ({ paycheck, period, runId }) => {
  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>OnyxOS</Text>
          <Text style={styles.headerSubtitle}>Payment Statement</Text>
        </View>

        {/* Statement Details */}
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Payee:</Text>
            <Text style={styles.value}>{paycheck.profile_name}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Role:</Text>
            <Text style={styles.value}>{paycheck.role.toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pay Period:</Text>
            <Text style={styles.value}>
              {formatDate(period.start)} - {formatDate(period.end)}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Statement ID:</Text>
            <Text style={styles.value}>{runId.slice(0, 8).toUpperCase()}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Pay Model:</Text>
            <Text style={styles.value}>{paycheck.pay_model.toUpperCase()}</Text>
          </View>
        </View>

        {/* Compensation Breakdown */}
        <Text style={styles.title}>Compensation Breakdown</Text>

        {/* Hourly Pay */}
        {(paycheck.pay_model === 'hourly' || paycheck.pay_model === 'hybrid') && paycheck.hourly_pay > 0 && (
          <View style={styles.lineItem}>
            <Text style={styles.lineItemLabel}>
              Base Pay ({paycheck.hours_worked.toFixed(2)} hours @ {formatCurrency(paycheck.hourly_rate)}/hr)
            </Text>
            <Text style={styles.lineItemValue}>{formatCurrency(paycheck.hourly_pay)}</Text>
          </View>
        )}

        {/* Commission Pay */}
        {(paycheck.pay_model === 'commission' || paycheck.pay_model === 'hybrid') && paycheck.commission_pay > 0 && (
          <View style={styles.lineItem}>
            <Text style={styles.lineItemLabel}>
              Performance Bonus ({(paycheck.commission_percent * 100).toFixed(1)}% of{' '}
              {formatCurrency(paycheck.sales_generated)} sales)
            </Text>
            <Text style={styles.lineItemValue}>{formatCurrency(paycheck.commission_pay)}</Text>
          </View>
        )}

        {/* Bonus */}
        {paycheck.bonus > 0 && (
          <View style={styles.lineItem}>
            <Text style={styles.lineItemLabel}>Additional Bonus</Text>
            <Text style={styles.lineItemValue}>{formatCurrency(paycheck.bonus)}</Text>
          </View>
        )}

        {/* Deductions */}
        {paycheck.deductions > 0 && (
          <View style={styles.lineItem}>
            <Text style={styles.lineItemLabel}>Deductions</Text>
            <Text style={styles.lineItemValue}>-{formatCurrency(paycheck.deductions)}</Text>
          </View>
        )}

        {/* Total */}
        <View style={styles.total}>
          <Text style={styles.totalLabel}>TOTAL TRANSFER:</Text>
          <Text style={styles.totalValue}>{formatCurrency(paycheck.total_payout)}</Text>
        </View>

        {/* Payment Information */}
        {paycheck.payment_method && (
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentTitle}>Payment Information</Text>
            <Text style={styles.paymentDetails}>Method: {paycheck.payment_method}</Text>
            {paycheck.payment_details?.email && (
              <Text style={styles.paymentDetails}>Email: {paycheck.payment_details.email}</Text>
            )}
            {paycheck.payment_details?.iban && (
              <Text style={styles.paymentDetails}>IBAN: {paycheck.payment_details.iban}</Text>
            )}
            <Text style={styles.paymentDetails}>
              Payment will be processed within 3-5 business days.
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is an official payment statement from Behave SRL.
          </Text>
          <Text style={styles.footerText}>
            Generated on {new Date().toLocaleDateString('en-US')} via OnyxOS Treasury System.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
