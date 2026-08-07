import { useState } from 'react';
import {
  Card, Table, Typography, Space, Spin, Alert,
  DatePicker, Button, message, Select
} from 'antd';
import { FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useGSTLedger } from '../../hooks/useAccounts';
import { generateGSTLedgerPdf } from '../../utils/gstLedgerPdf';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const GSTLedger = () => {
  const { org } = useOrganization();
  const { theme } = useTheme();
  const { selectedBranch, selectedFinancialYear } = useOutletContext() || {};

  const primaryColor = theme?.primary_color || '#0D47A1';
  const fontBody = theme?.font_body || 'Montserrat';
  const fontHeading = theme?.font_heading || 'Righteous';

  const [dateRange, setDateRange] = useState([
    selectedFinancialYear?.start_date ? dayjs(selectedFinancialYear.start_date) : dayjs().startOf('month'),
    selectedFinancialYear?.end_date ? dayjs(selectedFinancialYear.end_date) : dayjs().endOf('month'),
  ]);
  const [fetchParams, setFetchParams] = useState(null);

  const { data, isLoading, error, refetch } = useGSTLedger(
    fetchParams?.orgId,
    fetchParams?.start,
    fetchParams?.end,
    fetchParams?.branchId
  );

  const handleGenerate = () => {
    if (org?.id && dateRange && dateRange[0] && dateRange[1]) {
      setFetchParams({
        orgId: org.id,
        start: dateRange[0].format('YYYY-MM-DD'),
        end: dateRange[1].format('YYYY-MM-DD'),
        branchId: selectedBranch?.id || null,
      });
    }
  };

  const handleExportPDF = async () => {
    if (!data) {
      message.warning('Please generate the report first');
      return;
    }
    try {
      await generateGSTLedgerPdf({
        summary: data.summary || [],
        transactions: data.transactions || [],
        startDate: dateRange[0]?.format('DD/MM/YYYY') || '',
        endDate: dateRange[1]?.format('DD/MM/YYYY') || '',
        orgId: org.id,
        branchName: selectedBranch?.branch_name || 'All Branches',
        theme: {
          primary_color: primaryColor,
          font_heading: fontHeading,
          font_body: fontBody,
        },
      });
      message.success('PDF exported successfully');
    } catch (err) {
      console.error(err);
      message.error('Failed to generate PDF');
    }
  };

  // Summary columns
  const summaryColumns = [
    { title: 'Month', dataIndex: 'month', render: (m) => dayjs(m).format('MMM YYYY') },
    { title: 'Tax Type', dataIndex: 'tax_type' },
    { title: 'Total Debit', dataIndex: 'total_debit', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Total Credit', dataIndex: 'total_credit', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Net Balance', dataIndex: 'net_balance', render: (v) => `₹${(v || 0).toFixed(2)}` },
  ];

  // Transaction columns
  const transactionColumns = [
    { title: 'Date', dataIndex: 'date', render: (d) => dayjs(d).format('DD/MM/YYYY') },
    { title: 'Particulars', dataIndex: 'particulars' },
    { title: 'Voucher Type', dataIndex: 'voucher_type' },
    { title: 'Voucher No.', dataIndex: 'voucher_number' },
    { title: 'Tax Type', dataIndex: 'tax_type' },
    { title: 'Debit', dataIndex: 'debit', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Credit', dataIndex: 'credit', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Running Balance', dataIndex: 'running_balance', render: (v) => `₹${(v || 0).toFixed(2)}` },
  ];

  const summaryData = data?.summary || [];
  const transactionData = data?.transactions || [];

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Title level={4} style={{ margin: 0, color: primaryColor, fontFamily: fontHeading }}>
            GST Ledger
          </Title>
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={setDateRange}
              format="YYYY-MM-DD"
              allowClear={false}
            />
            <Button type="primary" onClick={handleGenerate} loading={isLoading}>
              Generate
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              disabled={!transactionData.length}
              style={{ borderColor: '#cf1322', color: '#cf1322' }}
            >
              Export PDF
            </Button>
            {transactionData.length > 0 && (
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} title="Refresh" />
            )}
          </Space>
        </div>

        {error && <Alert message={error.message} type="error" showIcon />}

        <Spin spinning={isLoading}>
          {transactionData.length > 0 ? (
            <>
              <Card title="Monthly Summary" size="small">
                <Table
                  dataSource={summaryData}
                  columns={summaryColumns}
                  rowKey={(_, i) => i}
                  pagination={false}
                  size="small"
                />
              </Card>
              <Card title="Transaction Details" size="small">
                <Table
                  dataSource={transactionData}
                  columns={transactionColumns}
                  rowKey={(_, i) => i}
                  pagination={{ pageSize: 50 }}
                  size="middle"
                />
              </Card>
            </>
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              {!fetchParams ? 'Select date range and click Generate' : 'No GST transactions found.'}
            </div>
          )}
        </Spin>
      </Space>
    </Card>
  );
};

export default GSTLedger;