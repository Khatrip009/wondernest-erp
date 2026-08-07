import { useState } from 'react';
import {
  Table, Card, Typography, Space, Spin, Alert,
  DatePicker, Button, message, Select
} from 'antd';
import { FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';
import { useAccounts } from '../../hooks/useAccounts';
import { generateGeneralLedgerPdf } from '../../utils/generalLedgerPdf';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Ledger = () => {
  const { theme } = useTheme();
  const outletContext = useOutletContext() || {};
  const { selectedBranch, selectedFinancialYear, orgId } = outletContext;

  const primaryColor = theme?.primary_color || '#0D47A1';
  const fontBody = theme?.font_body || 'Montserrat';

  // Default date range
  const [dateRange, setDateRange] = useState([
    selectedFinancialYear?.start_date ? dayjs(selectedFinancialYear.start_date) : dayjs().startOf('month'),
    selectedFinancialYear?.end_date ? dayjs(selectedFinancialYear.end_date) : dayjs().endOf('month'),
  ]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);

  // Fetch accounts for dropdown
  const { data: accounts, isLoading: acctLoading } = useAccounts(
    null,
    orgId,
    selectedBranch?.id,
    selectedFinancialYear?.id
  );

  // Fetch ledger entries via RPC
  const fetchLedger = async () => {
    if (!orgId || !dateRange || !dateRange[0] || !dateRange[1]) {
      return { rows: [], totals: { total_debit: 0, total_credit: 0 }, closing_balance: 0 };
    }
    const { data, error } = await supabase.rpc('get_general_ledger', {
      p_org_id: orgId,
      p_start_date: dateRange[0].format('YYYY-MM-DD'),
      p_end_date: dateRange[1].format('YYYY-MM-DD'),
      p_branch_id: selectedBranch?.id || null,
      p_financial_year_id: selectedFinancialYear?.id || null,
      p_account_id: selectedAccountId || null,
    });
    if (error) throw error;
    return data;
  };

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['general-ledger', orgId, dateRange, selectedAccountId, selectedBranch?.id, selectedFinancialYear?.id],
    queryFn: fetchLedger,
    enabled: !!orgId && !!dateRange && !!dateRange[0] && !!dateRange[1],
    staleTime: 60 * 1000,
  });

  const handleGenerate = () => {
    refetch();
  };

  const handleExportPDF = async () => {
    if (!data || !data.rows?.length) {
      message.warning('No data to export');
      return;
    }
    try {
      // Build display name: "Account Name (Code)" if account selected, else "All Accounts"
      const selectedAccount = accounts?.find(a => a.id === selectedAccountId);
      const accountDisplayName = selectedAccount 
        ? `${selectedAccount.account_name} (${selectedAccount.account_code})` 
        : 'All Accounts';

      await generateGeneralLedgerPdf({
        rows: data.rows || [],
        totals: data.totals || { total_debit: 0, total_credit: 0 },
        closingBalance: data.closing_balance || 0,
        startDate: dateRange[0]?.format('DD/MM/YYYY') || '',
        endDate: dateRange[1]?.format('DD/MM/YYYY') || '',
        orgId,
        branchName: selectedBranch?.branch_name || 'All Branches',
        accountName: accountDisplayName,
        theme: {
          primary_color: theme?.primary_color || '#0D47A1',
          font_heading: theme?.font_heading || 'Helvetica',
          font_body: theme?.font_body || 'Helvetica',
        },
      });
      message.success('PDF exported successfully');
    } catch (err) {
      console.error(err);
      message.error('Failed to generate PDF');
    }
  };

  const columns = [
    { title: 'Date', dataIndex: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Dr/Cr', dataIndex: 'dr_cr', width: 60 },
    { title: 'Particulars', dataIndex: 'particulars' },
    { title: 'Voucher Type', dataIndex: 'voucher_type' },
    { title: 'Voucher No.', dataIndex: 'voucher_number' },
    { title: 'Debit', dataIndex: 'debit', render: (v) => v > 0 ? `₹${v.toFixed(2)}` : '-' },
    { title: 'Credit', dataIndex: 'credit', render: (v) => v > 0 ? `₹${v.toFixed(2)}` : '-' },
  ];

  const dataSource = data?.rows || [];
  const totalDebit = data?.totals?.total_debit || 0;
  const totalCredit = data?.totals?.total_credit || 0;
  const closingBalance = data?.closing_balance || 0;

  return (
    <Card bordered={false} style={{ borderRadius: 8, borderTop: `4px solid ${primaryColor}` }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Title level={4} style={{ margin: 0, color: primaryColor, fontFamily: fontBody }}>General Ledger</Title>
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
              allowClear={false}
            />
            <Select
              placeholder="Filter by Account"
              allowClear
              showSearch
              optionFilterProp="children"
              style={{ width: 200 }}
              value={selectedAccountId}
              onChange={setSelectedAccountId}
              loading={acctLoading}
            >
              {accounts?.map(a => (
                <Select.Option key={a.id} value={a.id}>
                  {a.account_name} ({a.account_code})
                </Select.Option>
              ))}
            </Select>
            <Button type="primary" onClick={handleGenerate} loading={isLoading}>
              Generate
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              disabled={!dataSource.length}
              style={{ borderColor: '#cf1322', color: '#cf1322' }}
            >
              PDF
            </Button>
            {data && (
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} title="Refresh" />
            )}
          </Space>
        </div>

        {error && <Alert message={error.message} type="error" showIcon />}

        <Spin spinning={isLoading}>
          {data ? (
            dataSource.length > 0 ? (
              <Table
                columns={columns}
                dataSource={dataSource}
                rowKey={(_, i) => i}
                pagination={{ pageSize: 50 }}
                size="middle"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5}>
                        <strong style={{ color: primaryColor }}>Total</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5}>
                        <strong style={{ color: primaryColor }}>₹{totalDebit.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6}>
                        <strong style={{ color: primaryColor }}>₹{totalCredit.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5}>
                        <strong style={{ color: primaryColor }}>Closing Balance</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} colSpan={2}>
                        <strong style={{ color: primaryColor }}>
                          ₹{(closingBalance >= 0 ? closingBalance : Math.abs(closingBalance)).toFixed(2)}
                          <span style={{ marginLeft: 8 }}>
                            {closingBalance >= 0 ? '(Dr)' : '(Cr)'}
                          </span>
                        </strong>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                No entries found for the selected period.
              </div>
            )
          ) : (
            <div style={{ padding: 20, textAlign: 'center' }}>
              {!dateRange ? 'Select date range and click Generate' : 'No data available'}
            </div>
          )}
        </Spin>
      </Space>
    </Card>
  );
};

export default Ledger;