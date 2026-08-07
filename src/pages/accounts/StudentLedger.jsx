import { useState } from 'react';
import {
  Card, Table, Select, Button, Space, Tag, message,
  Row, Col, Statistic, Typography
} from 'antd';
import { DownloadOutlined, FilePdfOutlined, WalletOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import dayjs from 'dayjs';
import { exportStudentLedgerPDF } from '../../utils/exportLedgerPDF';

const { Text } = Typography;

const StudentLedger = () => {
  const { theme } = useTheme();
  const outletContext = useOutletContext() || {};
  const { selectedBranch, selectedFinancialYear, orgId: contextOrgId } = outletContext;
  const { org: orgFromProvider } = useOrganization();
  const orgId = contextOrgId || orgFromProvider?.id;

  const primaryColor = theme?.primary_color || '#0D47A1';
  const fontHeading = theme?.font_heading || 'Righteous';
  const fontBody = theme?.font_body || 'Montserrat';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);

  // Search students
  const { data: studentList, isLoading: studentLoading, error: searchError } = useQuery({
    queryKey: ['students-search', searchTerm, orgId],
    queryFn: async () => {
      if (!searchTerm || searchTerm.length < 2 || !orgId) return [];
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name_formatted, admission_no')
        .eq('organization_id', orgId)
        .or(`full_name_formatted.ilike.%${searchTerm}%,admission_no.ilike.%${searchTerm}%`)
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: searchTerm.length > 1 && !!orgId,
    staleTime: 1000 * 60,
  });

  // Fetch ledger entries: fees + payments
  const { data: ledgerEntries, isLoading: ledgerLoading, error: ledgerError } = useQuery({
    queryKey: ['student-ledger', selectedStudent?.id, selectedBranch?.id, selectedFinancialYear?.id, orgId],
    queryFn: async () => {
      if (!selectedStudent || !orgId) return [];

      // 1. Fetch student fees
      let feesQuery = supabase
        .from('student_fees')
        .select(`
          id,
          final_fee,
          discount,
          total_fee,
          status,
          due_date,
          created_at,
          paid_amount,
          invoice_id,
          service_id
        `)
        .eq('student_id', selectedStudent.id)
        .order('created_at', { ascending: true });

      if (selectedBranch?.id) {
        feesQuery = feesQuery.eq('branch_id', selectedBranch.id);
      }
      if (selectedFinancialYear?.id) {
        feesQuery = feesQuery.eq('financial_year_id', selectedFinancialYear.id);
      }

      const { data: fees, error: feesError } = await feesQuery;
      if (feesError) throw feesError;

      // 2. Get all fee IDs to fetch payments
      const feeIds = fees.map(f => f.id);

      let payments = [];
      if (feeIds.length > 0) {
        let paymentsQuery = supabase
          .from('fee_payments')
          .select(`
            id,
            payment_date,
            amount,
            payment_mode,
            receipt_number,
            transaction_no,
            invoice_id,
            remarks,
            base_amount,
            tax_amount,
            student_fee_id
          `)
          .in('student_fee_id', feeIds)
          .order('payment_date', { ascending: true });

        if (selectedBranch?.id) {
          paymentsQuery = paymentsQuery.eq('branch_id', selectedBranch.id);
        }
        if (selectedFinancialYear?.id) {
          paymentsQuery = paymentsQuery.eq('financial_year_id', selectedFinancialYear.id);
        }

        const { data: payData, error: payError } = await paymentsQuery;
        if (payError) throw payError;
        payments = payData || [];
      }

      // 3. Combine into ledger entries
      const entries = [];

      fees.forEach(fee => {
        entries.push({
          date: fee.created_at || fee.due_date,
          description: `Fee - ${fee.status} (ID: ${fee.id})`,
          reference: fee.invoice_id ? `INV-${fee.invoice_id}` : `Fee #${fee.id}`,
          debit: Number(fee.final_fee) || 0,
          credit: 0,
          balance: 0,
          type: 'Fee',
          fee_id: fee.id,
          status: fee.status,
        });
      });

      payments.forEach(pay => {
        entries.push({
          date: pay.payment_date,
          description: `Payment - ${pay.payment_mode}`,
          reference: pay.receipt_number || pay.transaction_no || 'N/A',
          debit: 0,
          credit: Number(pay.amount) || 0,
          balance: 0,
          type: 'Payment',
          payment_id: pay.id,
          fee_id: pay.student_fee_id,
        });
      });

      // Sort by date
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calculate running balance (debit - credit)
      let running = 0;
      return entries.map(e => {
        running = running + (e.debit - e.credit);
        return { ...e, balance: running };
      });
    },
    enabled: !!selectedStudent && !!orgId,
  });

  if (!orgId) {
    return (
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <p style={{ textAlign: 'center', color: '#999' }}>No organization selected. Please log in again.</p>
      </Card>
    );
  }

  // Compute summary totals from entries
  const totalFees = ledgerEntries?.reduce((sum, e) => sum + (e.type === 'Fee' ? e.debit : 0), 0) || 0;
  const totalPaid = ledgerEntries?.reduce((sum, e) => sum + (e.type === 'Payment' ? e.credit : 0), 0) || 0;
  const outstanding = totalFees - totalPaid;

  const columns = [
    {
      title: 'Date',
      dataIndex: 'date',
      render: (d) => dayjs(d).format('DD/MM/YYYY'),
    },
    { title: 'Description', dataIndex: 'description' },
    { title: 'Reference', dataIndex: 'reference' },
    {
      title: 'Debit',
      dataIndex: 'debit',
      render: (v) => v > 0 ? `₹${(v || 0).toFixed(2)}` : '-',
    },
    {
      title: 'Credit',
      dataIndex: 'credit',
      render: (v) => v > 0 ? `₹${(v || 0).toFixed(2)}` : '-',
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      render: (v) => `₹${(v || 0).toFixed(2)}`,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      render: (t) => <Tag color={t === 'Fee' ? 'blue' : 'green'}>{t}</Tag>,
    },
  ];

  const handleStudentSelect = (value) => {
    const student = studentList?.find(s => s.id === value);
    setSelectedStudent(student);
  };

  const exportCSV = () => {
    if (!ledgerEntries?.length) {
      message.warning('No data to export');
      return;
    }
    const headers = ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance', 'Type'];
    const rows = ledgerEntries.map(e => [
      dayjs(e.date).format('DD/MM/YYYY'),
      e.description,
      e.reference,
      (e.debit || 0).toFixed(2),
      (e.credit || 0).toFixed(2),
      (e.balance || 0).toFixed(2),
      e.type,
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Student_Ledger_${selectedStudent?.admission_no || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('CSV exported');
  };

  const exportPDF = () => {
    if (!selectedStudent || !ledgerEntries?.length) {
      message.warning('No data to export');
      return;
    }
    exportStudentLedgerPDF(selectedStudent, ledgerEntries, {
      branchName: selectedBranch?.branch_name || 'All',
      financialYearName: selectedFinancialYear?.name || 'All',
      primaryColor: theme?.primary_color || '#0D47A1',
      fontBody: theme?.font_body || 'Helvetica',
      letterheadUrl: orgFromProvider?.letterhead_url,
      fromDate: null,
      toDate: null,
    });
  };

  const options = studentList?.map(s => ({
    label: `${s.full_name_formatted || s.admission_no || 'Student'} (${s.admission_no || 'N/A'})`,
    value: s.id
  })) || [];

  return (
    <div style={{ fontFamily: fontBody }}>
      <Card
        bordered={false}
        style={{
          borderRadius: 8,
          borderTop: `4px solid ${primaryColor}`,
          marginBottom: 16,
        }}
        headStyle={{
          color: primaryColor,
          fontFamily: fontHeading,
          fontSize: 18,
        }}
        title="Student Ledger"
      >
        <Space style={{ width: '100%' }}>
          <Select
            showSearch
            placeholder="Search student by name or admission no"
            onSearch={setSearchTerm}
            onChange={handleStudentSelect}
            options={options}
            style={{ flex: 1 }}
            loading={studentLoading}
            allowClear
            onClear={() => setSelectedStudent(null)}
            filterOption={false}
          />
          <Button icon={<DownloadOutlined />} onClick={exportCSV} disabled={!ledgerEntries?.length}>
            CSV
          </Button>
          <Button icon={<FilePdfOutlined />} onClick={exportPDF} disabled={!ledgerEntries?.length}>
            PDF
          </Button>
        </Space>
        {searchError && (
          <div style={{ marginTop: 8, color: 'red' }}>
            Error loading students: {searchError.message}
          </div>
        )}
        {ledgerError && (
          <div style={{ marginTop: 8, color: 'red' }}>
            Error loading ledger: {ledgerError.message}
          </div>
        )}
      </Card>

      {selectedStudent && (
        <>
          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
              marginBottom: 16,
            }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Statistic
                  title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Total Fees Assigned</span>}
                  value={totalFees}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: primaryColor }}
                  prefix={<WalletOutlined />}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Total Paid</span>}
                  value={totalPaid}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Statistic
                  title={<span style={{ color: primaryColor, fontFamily: fontHeading }}>Outstanding Balance</span>}
                  value={outstanding}
                  precision={2}
                  prefix="₹"
                  valueStyle={{ color: outstanding >= 0 ? primaryColor : '#cf1322' }}
                  prefix={<ExclamationCircleOutlined />}
                />
                {outstanding < 0 && (
                  <div style={{ fontSize: '12px', color: '#cf1322' }}>
                    (Overpaid by ₹{Math.abs(outstanding).toFixed(2)})
                  </div>
                )}
              </Col>
            </Row>
          </Card>

          <Card
            bordered={false}
            style={{
              borderRadius: 8,
              borderTop: `4px solid ${primaryColor}`,
            }}
            headStyle={{
              color: primaryColor,
              fontFamily: fontHeading,
              fontSize: 16,
            }}
            title={`Student: ${selectedStudent.full_name_formatted} (${selectedStudent.admission_no})`}
          >
            {ledgerEntries?.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                No fees or payments found for this student.
              </div>
            ) : (
              <Table
                dataSource={ledgerEntries}
                columns={columns}
                rowKey={(_, i) => i}
                loading={ledgerLoading}
                pagination={{ pageSize: 20 }}
                size="middle"
                summary={(pageData) => {
                  if (!pageData.length) return null;
                  const totalDebit = pageData.reduce((s, e) => s + (e.debit || 0), 0);
                  const totalCredit = pageData.reduce((s, e) => s + (e.credit || 0), 0);
                  const closingBalance = pageData[pageData.length - 1]?.balance || 0;
                  return (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={3}>
                          <strong style={{ color: primaryColor }}>Totals</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={3}>
                          <strong style={{ color: primaryColor }}>₹{totalDebit.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={4}>
                          <strong style={{ color: primaryColor }}>₹{totalCredit.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={5}>
                          <strong style={{ color: primaryColor }}>₹{closingBalance.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    </Table.Summary>
                  );
                }}
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
};

export default StudentLedger;