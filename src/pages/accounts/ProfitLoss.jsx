// src/pages/accounts/ProfitLoss.jsx
import { useState, useEffect } from 'react';
import {
  Table, Card, Typography, Space, Spin, Alert,
  DatePicker, Button, message
} from 'antd';
import { FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';   // ✅ import theme
import { useProfitLoss } from '../../hooks/useReports';
import { generateProfitLossPdf } from '../../utils/profitLossPdf';
import dayjs from 'dayjs';

const { Title } = Typography;

const ProfitLoss = () => {
  const { org } = useOrganization();
  const { theme } = useTheme();                         // ✅ get theme
  const { selectedBranch, selectedFinancialYear } = useOutletContext() || {};

  const [startDate, setStartDate] = useState(
    selectedFinancialYear?.start_date ? dayjs(selectedFinancialYear.start_date) : null
  );
  const [endDate, setEndDate] = useState(
    selectedFinancialYear?.end_date ? dayjs(selectedFinancialYear.end_date) : null
  );
  const [fetchParams, setFetchParams] = useState(null);

  const { data, isLoading, error, refetch } = useProfitLoss(
    fetchParams?.orgId,
    fetchParams?.start,
    fetchParams?.end,
    fetchParams?.branchId
  );

  // ─── Debug: log data when available ──────────────────────
  useEffect(() => {
    if (data) {
      console.log('📊 ProfitLoss data:', data);
      console.log('📊 Sections:', data.sections);
      console.log('📊 Totals:', data.totals);
    }
  }, [data]);

  const handleGenerate = () => {
    if (org?.id && startDate && endDate) {
      setFetchParams({
        orgId: org.id,
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.format('YYYY-MM-DD'),
        branchId: selectedBranch?.id || null,
      });
    }
  };

  // ─── Export PDF ─────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (!data) {
      message.warning('Please generate the report first');
      return;
    }

    try {
      // Build groups object from sections
      const groups = {};
      data.sections?.forEach((section) => {
        groups[section.sectionName] = {
          items: section.items || [],
          total: section.subtotal || 0,
        };
      });

      // Compute totals from data.totals or calculate from sections
      const totals = data.totals || {};
      const revenue = totals['Revenue'] || 0;
      const otherIncome = totals['Other Income'] || 0;
      const cogs = totals['COGS'] || 0;
      const opex = totals['Operating Expenses'] || 0;
      const otherExp = totals['Other Expenses'] || 0;

      const totalIncome = revenue + otherIncome;
      const totalExpense = cogs + opex + otherExp;
      const profit = totalIncome - totalExpense;

      // Fallback: if totals are empty, compute from sections
      if (Object.keys(totals).length === 0 && data.sections?.length) {
        let sumIncome = 0, sumExpense = 0;
        data.sections.forEach(s => {
          if (s.sectionName === 'Revenue' || s.sectionName === 'Other Income') {
            sumIncome += s.subtotal || 0;
          } else {
            sumExpense += s.subtotal || 0;
          }
        });
        const computedProfit = sumIncome - sumExpense;
        const summary = { totalIncome: sumIncome, totalExpense: sumExpense, profit: computedProfit };
        const periodLabel = `${startDate?.format('DD/MM/YYYY') || 'Start'} - ${endDate?.format('DD/MM/YYYY') || 'End'}`;
        await generateProfitLossPdf({
          groups,
          summary,
          periodLabel,
          orgId: org.id,
          theme: {
            primary_color: theme?.primary_color || '#0D47A1',
            font_heading: theme?.font_heading || 'Helvetica',
            font_body: theme?.font_body || 'Helvetica',
          },
        });
        message.success('PDF exported successfully');
        return;
      }

      const summary = { totalIncome, totalExpense, profit };
      const periodLabel = `${startDate?.format('DD/MM/YYYY') || 'Start'} - ${endDate?.format('DD/MM/YYYY') || 'End'}`;

      await generateProfitLossPdf({
        groups,
        summary,
        periodLabel,
        orgId: org.id,
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

  // ─── Build table rows ───────────────────────────────────────
  const buildRows = () => {
    if (!data) return [];
    const sections = data.sections || [];
    if (sections.length === 0) {
      return [{
        key: 'no-data',
        account: 'No transactions found',
        amount: null,
        isHeader: false,
        isSubtotal: false,
      }];
    }
    let rows = [];
    let netProfit = 0;

    sections.forEach((section) => {
      const { sectionName, items, subtotal } = section;

      rows.push({
        key: `header-${sectionName}`,
        account: sectionName,
        amount: null,
        isHeader: true,
        isSubtotal: false,
      });

      (items || []).forEach((item, idx) => {
        rows.push({
          key: `${sectionName}-${idx}`,
          account: item.account,
          amount: item.amount,
          isHeader: false,
          isSubtotal: false,
        });
      });

      rows.push({
        key: `subtotal-${sectionName}`,
        account: `Total ${sectionName}`,
        amount: subtotal,
        isHeader: false,
        isSubtotal: true,
      });

      if (sectionName === 'Revenue') netProfit += subtotal;
      else if (sectionName === 'COGS') netProfit -= subtotal;
      else if (sectionName === 'Operating Expenses') netProfit -= subtotal;
      else if (sectionName === 'Other Income') netProfit += subtotal;
      else if (sectionName === 'Other Expenses') netProfit -= subtotal;
    });

    rows.push({
      key: 'net-profit',
      account: 'Net Profit / (Loss)',
      amount: netProfit,
      isHeader: false,
      isSubtotal: true,
      isNetProfit: true,
    });

    return rows;
  };

  const columns = [
    {
      title: 'Particulars',
      dataIndex: 'account',
      key: 'account',
      render: (text, record) => {
        if (record.isHeader) {
          return <strong style={{ fontSize: '1.1em' }}>{text}</strong>;
        }
        if (record.isSubtotal) {
          return <strong>{text}</strong>;
        }
        return <span style={{ paddingLeft: '16px' }}>{text}</span>;
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (val) => (val !== null && val !== undefined ? val.toFixed(2) : ''),
    },
  ];

  const dataSource = buildRows();

  return (
    <Card>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4}>Profit & Loss Statement</Title>
          <Space>
            <DatePicker
              placeholder="Start Date"
              value={startDate}
              onChange={setStartDate}
              format="YYYY-MM-DD"
            />
            <DatePicker
              placeholder="End Date"
              value={endDate}
              onChange={setEndDate}
              format="YYYY-MM-DD"
            />
            <Button type="primary" onClick={handleGenerate} loading={isLoading}>
              Generate
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              disabled={!data}
              style={{ borderColor: '#cf1322', color: '#cf1322' }}
            >
              Export PDF
            </Button>
            {data && (
              <Button
                icon={<ReloadOutlined />}
                onClick={() => refetch()}
                title="Refresh data"
              />
            )}
          </Space>
        </div>

        {error && <Alert message={error.message} type="error" showIcon />}

        <Spin spinning={isLoading}>
          {data ? (
            data.sections?.length > 0 ? (
              <Table
                columns={columns}
                dataSource={dataSource}
                pagination={false}
                size="middle"
                rowKey="key"
              />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                No transactions found for the selected period.
                <br />
                <span style={{ fontSize: '12px' }}>
                  Try adjusting the date range or check if journal entries exist.
                </span>
              </div>
            )
          ) : (
            <div style={{ padding: 20, textAlign: 'center' }}>
              {!fetchParams ? 'Select date range and click Generate' : 'No data available'}
            </div>
          )}
        </Spin>
      </Space>
    </Card>
  );
};

export default ProfitLoss;