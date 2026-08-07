import { useState } from 'react';
import {
  Card, Table, Typography, Space, Spin, Alert,
  DatePicker, Button, message
} from 'antd';
import { FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useProfitLoss } from '../../hooks/useReports';
import { generateProfitLossPdf } from '../../utils/profitLossPdf';
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

const Income = () => {
  const { org } = useOrganization();
  const { theme } = useTheme();
  const { selectedBranch, selectedFinancialYear } = useOutletContext() || {};

  const primaryColor = theme?.primary_color || '#0D47A1';
  const fontHeading = theme?.font_heading || 'Helvetica';
  const fontBody = theme?.font_body || 'Helvetica';

  const [dateRange, setDateRange] = useState([
    selectedFinancialYear?.start_date ? dayjs(selectedFinancialYear.start_date) : dayjs().subtract(1, 'year'),
    selectedFinancialYear?.end_date ? dayjs(selectedFinancialYear.end_date) : dayjs(),
  ]);
  const [fetchParams, setFetchParams] = useState(null);

  const getPreviousRange = (start, end) => {
    const diffDays = end.diff(start, 'day');
    const prevEnd = start.subtract(1, 'day');
    const prevStart = prevEnd.subtract(diffDays, 'day');
    return { prevStart, prevEnd };
  };

  const { data: currentData, isLoading: currentLoading, error: currentError, refetch: refetchCurrent } = useProfitLoss(
    fetchParams?.orgId,
    fetchParams?.start,
    fetchParams?.end,
    fetchParams?.branchId
  );

  const { data: prevData, isLoading: prevLoading, error: prevError, refetch: refetchPrev } = useProfitLoss(
    fetchParams?.orgId,
    fetchParams?.prevStart,
    fetchParams?.prevEnd,
    fetchParams?.branchId
  );

  const handleGenerate = () => {
    if (org?.id && dateRange && dateRange[0] && dateRange[1]) {
      const start = dateRange[0];
      const end = dateRange[1];
      const { prevStart, prevEnd } = getPreviousRange(start, end);
      setFetchParams({
        orgId: org.id,
        start: start.format('YYYY-MM-DD'),
        end: end.format('YYYY-MM-DD'),
        prevStart: prevStart.format('YYYY-MM-DD'),
        prevEnd: prevEnd.format('YYYY-MM-DD'),
        branchId: selectedBranch?.id || null,
      });
    }
  };

  const handleExportPDF = async () => {
    if (!currentData) {
      message.warning('Please generate the report first');
      return;
    }
    try {
      const groups = {};
      currentData.sections?.forEach((section) => {
        groups[section.sectionName] = {
          items: section.items || [],
          total: section.subtotal || 0,
        };
      });
      const totals = currentData.totals || {};
      const revenue = totals['Revenue'] || 0;
      const otherIncome = totals['Other Income'] || 0;
      const cogs = totals['COGS'] || 0;
      const opex = totals['Operating Expenses'] || 0;
      const otherExp = totals['Other Expenses'] || 0;
      const totalIncome = revenue + otherIncome;
      const totalExpense = cogs + opex + otherExp;
      const profit = totalIncome - totalExpense;
      const summary = { totalIncome, totalExpense, profit };
      const periodLabel = `${dateRange[0]?.format('DD/MM/YYYY')} - ${dateRange[1]?.format('DD/MM/YYYY')}`;

      await generateProfitLossPdf({
        groups,
        summary,
        periodLabel,
        orgId: org.id,
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

  const buildRows = () => {
    if (!currentData && !prevData) return [];

    const getSectionTotal = (data, sectionName) => {
      if (!data || !data.sections) return 0;
      const section = data.sections.find(s => s.sectionName === sectionName);
      return section ? section.subtotal : 0;
    };

    const currentSections = currentData?.sections || [];
    const prevSections = prevData?.sections || [];

    const currentRevenue = getSectionTotal(currentData, 'Revenue') + getSectionTotal(currentData, 'Other Income');
    const prevRevenue = getSectionTotal(prevData, 'Revenue') + getSectionTotal(prevData, 'Other Income');

    const currentExpenses = getSectionTotal(currentData, 'COGS') + getSectionTotal(currentData, 'Operating Expenses') + getSectionTotal(currentData, 'Other Expenses');
    const prevExpenses = getSectionTotal(prevData, 'COGS') + getSectionTotal(prevData, 'Operating Expenses') + getSectionTotal(prevData, 'Other Expenses');

    const currentOpIncome = currentRevenue - currentExpenses;
    const prevOpIncome = prevRevenue - prevExpenses;

    const currentNonOp = getSectionTotal(currentData, 'Other Income') - getSectionTotal(currentData, 'Other Expenses');
    const prevNonOp = getSectionTotal(prevData, 'Other Income') - getSectionTotal(prevData, 'Other Expenses');

    const currentNet = currentOpIncome + currentNonOp;
    const prevNet = prevOpIncome + prevNonOp;

    const rows = [];

    rows.push({ key: 'revenue-header', account: 'Revenue', current: null, prev: null, isHeader: true });
    const revenueItems = currentSections.find(s => s.sectionName === 'Revenue')?.items || [];
    const prevRevenueItems = prevSections.find(s => s.sectionName === 'Revenue')?.items || [];
    const allRevAccounts = new Set([...revenueItems.map(i => i.account), ...prevRevenueItems.map(i => i.account)]);
    allRevAccounts.forEach(account => {
      const curAmt = revenueItems.find(i => i.account === account)?.amount || 0;
      const prevAmt = prevRevenueItems.find(i => i.account === account)?.amount || 0;
      if (curAmt !== 0 || prevAmt !== 0) {
        rows.push({ key: `revenue-${account}`, account, current: curAmt, prev: prevAmt, isHeader: false });
      }
    });
    rows.push({ key: 'revenue-total', account: 'Total Revenue', current: currentRevenue, prev: prevRevenue, isSubtotal: true });

    const expenseNames = ['COGS', 'Operating Expenses', 'Other Expenses'];
    expenseNames.forEach(sectionName => {
      const curItems = currentSections.find(s => s.sectionName === sectionName)?.items || [];
      const prevItems = prevSections.find(s => s.sectionName === sectionName)?.items || [];
      const allExpAccounts = new Set([...curItems.map(i => i.account), ...prevItems.map(i => i.account)]);
      if (allExpAccounts.size > 0) {
        rows.push({ key: `exp-header-${sectionName}`, account: sectionName, current: null, prev: null, isHeader: true });
        allExpAccounts.forEach(account => {
          const curAmt = curItems.find(i => i.account === account)?.amount || 0;
          const prevAmt = prevItems.find(i => i.account === account)?.amount || 0;
          if (curAmt !== 0 || prevAmt !== 0) {
            rows.push({ key: `exp-${sectionName}-${account}`, account, current: curAmt, prev: prevAmt, isHeader: false });
          }
        });
        const total = getSectionTotal(currentData, sectionName);
        const prevTotal = getSectionTotal(prevData, sectionName);
        rows.push({ key: `exp-total-${sectionName}`, account: `Total ${sectionName}`, current: total, prev: prevTotal, isSubtotal: true });
      }
    });

    rows.push({ key: 'expenses-total', account: 'Total Expenses', current: currentExpenses, prev: prevExpenses, isSubtotal: true });
    rows.push({ key: 'op-income', account: 'Operating Income', current: currentOpIncome, prev: prevOpIncome, isSubtotal: true, isOperatingIncome: true });
    rows.push({ key: 'nonop-header', account: 'Non‑Operating Gains (Losses)', current: null, prev: null, isHeader: true });
    rows.push({ key: 'nonop-total', account: 'Total Non‑Operating', current: currentNonOp, prev: prevNonOp, isSubtotal: true });
    rows.push({ key: 'net-income', account: 'Net Income (Loss)', current: currentNet, prev: prevNet, isSubtotal: true, isNetIncome: true });

    return rows;
  };

  const columns = [
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Particulars</span>,
      dataIndex: 'account',
      key: 'account',
      render: (text, record) => {
        if (record.isHeader) {
          return <strong style={{ fontSize: '1.05em', color: primaryColor, fontFamily: fontHeading }}>{text}</strong>;
        }
        if (record.isSubtotal) {
          return <strong style={{ color: primaryColor, fontFamily: fontBody }}>{text}</strong>;
        }
        return <span style={{ color: '#333', fontFamily: fontBody }}>{text}</span>;
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Current Period ({dateRange[0]?.format('YYYY')} – {dateRange[1]?.format('YYYY')})</span>,
      dataIndex: 'current',
      key: 'current',
      align: 'right',
      render: (val, record) => {
        if (val === null || val === undefined) return '';
        const style = record.isSubtotal ? { color: primaryColor, fontWeight: 'bold', fontFamily: fontBody } : { color: '#333', fontFamily: fontBody };
        return <span style={style}>₹{val.toFixed(2)}</span>;
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Previous Period ({dateRange[0]?.subtract(1, 'year').format('YYYY')} – {dateRange[1]?.subtract(1, 'year').format('YYYY')})</span>,
      dataIndex: 'prev',
      key: 'prev',
      align: 'right',
      render: (val, record) => {
        if (val === null || val === undefined) return '';
        const style = record.isSubtotal ? { color: primaryColor, fontWeight: 'bold', fontFamily: fontBody } : { color: '#333', fontFamily: fontBody };
        return <span style={style}>₹{val.toFixed(2)}</span>;
      },
    },
    {
      title: <span style={{ color: primaryColor, fontFamily: fontHeading }}>Change (%)</span>,
      key: 'change',
      align: 'right',
      render: (_, record) => {
        if (record.current === null || record.prev === null || record.prev === 0) return <span style={{ color: '#999' }}>-</span>;
        const change = ((record.current - record.prev) / Math.abs(record.prev)) * 100;
        const color = change >= 0 ? '#3f8600' : '#cf1322';
        return <span style={{ color, fontFamily: fontBody }}>{change.toFixed(1)}%</span>;
      },
    },
  ];

  const dataSource = buildRows();
  const isLoading = currentLoading || prevLoading;
  const error = currentError || prevError;

  return (
    <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Title level={4} style={{ margin: 0, color: primaryColor, fontFamily: fontHeading }}>
            Income Statement
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
              disabled={!currentData}
              style={{ borderColor: '#cf1322', color: '#cf1322' }}
            >
              Export PDF
            </Button>
            {dataSource.length > 0 && (
              <Button icon={<ReloadOutlined />} onClick={() => { refetchCurrent(); refetchPrev(); }} title="Refresh" />
            )}
          </Space>
        </div>

        {error && <Alert message={error.message} type="error" showIcon />}

        <Spin spinning={isLoading}>
          {dataSource.length > 0 ? (
            <Table
              columns={columns}
              dataSource={dataSource}
              pagination={false}
              size="middle"
              rowKey="key"
              style={{ fontFamily: fontBody }}
            />
          ) : (
            <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
              {!fetchParams ? 'Select date range and click Generate' : 'No data available'}
            </div>
          )}
        </Spin>
      </Space>
    </Card>
  );
};

export default Income;