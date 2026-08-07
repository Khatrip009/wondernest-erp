// src/pages/accounts/BalanceSheet.jsx
import { useState } from 'react';
import {
  Table, Card, Typography, Space, Spin, Alert,
  DatePicker, Button, message
} from 'antd';
import { FilePdfOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useOutletContext } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBalanceSheet } from '../../hooks/useReports';
import { generateBalanceSheetPdf } from '../../utils/balanceSheetPdf';
import dayjs from 'dayjs';

const { Title } = Typography;

const BalanceSheet = () => {
  const { org } = useOrganization();
  const { theme } = useTheme();
  const { selectedBranch, selectedFinancialYear } = useOutletContext() || {};

  const [asOnDate, setAsOnDate] = useState(
    selectedFinancialYear?.end_date ? dayjs(selectedFinancialYear.end_date) : dayjs()
  );
  const [fetchParams, setFetchParams] = useState(null);

  const { data, isLoading, error, refetch } = useBalanceSheet(
    fetchParams?.orgId,
    fetchParams?.asOn,
    fetchParams?.branchId
  );

  const handleGenerate = () => {
    if (org?.id && asOnDate) {
      setFetchParams({
        orgId: org.id,
        asOn: asOnDate.format('YYYY-MM-DD'),
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
      const sections = data.sections || [];
      // Build groups for PDF (maintain nested structure)
      const groups = {};
      sections.forEach((section) => {
        const sectionName = section.sectionName;
        groups[sectionName] = {
          subsections: section.subsections || [],
          total: section.total || 0,
        };
      });

      await generateBalanceSheetPdf({
        groups,
        asOnDate: asOnDate.format('DD/MM/YYYY'),
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

  // Build table rows with indentation
  const buildRows = () => {
    if (!data) return [];
    const sections = data.sections || [];
    if (sections.length === 0) {
      return [{ key: 'no-data', account: 'No data', amount: null, isHeader: false }];
    }
    let rows = [];
    sections.forEach((section) => {
      // Section header (bold)
      rows.push({
        key: `section-${section.sectionName}`,
        account: section.sectionName,
        amount: null,
        isHeader: true,
        isSectionHeader: true,
      });
      // Subsections
      (section.subsections || []).forEach((sub) => {
        // Subsection header (bold, indented)
        rows.push({
          key: `sub-${sub.subsectionName}`,
          account: sub.subsectionName,
          amount: null,
          isHeader: true,
          isSubsectionHeader: true,
        });
        // Items (indented)
        (sub.items || []).forEach((item, idx) => {
          rows.push({
            key: `${sub.subsectionName}-${idx}`,
            account: item.account,
            amount: item.amount,
            isHeader: false,
            isItem: true,
          });
        });
        // Subtotal
        rows.push({
          key: `subtotal-${sub.subsectionName}`,
          account: `Total ${sub.subsectionName}`,
          amount: sub.subtotal,
          isHeader: false,
          isSubtotal: true,
        });
      });
      // Section total
      rows.push({
        key: `total-${section.sectionName}`,
        account: `Total ${section.sectionName}`,
        amount: section.total,
        isHeader: false,
        isSectionTotal: true,
      });
    });
    return rows;
  };

  const columns = [
    {
      title: 'Particulars',
      dataIndex: 'account',
      key: 'account',
      render: (text, record) => {
        if (record.isSectionHeader) {
          return <strong style={{ fontSize: '1.2em' }}>{text}</strong>;
        }
        if (record.isSubsectionHeader) {
          return <strong style={{ fontSize: '1.05em', paddingLeft: '16px' }}>{text}</strong>;
        }
        if (record.isSubtotal || record.isSectionTotal) {
          return <strong style={{ paddingLeft: record.isSectionTotal ? '0' : '16px' }}>{text}</strong>;
        }
        return <span style={{ paddingLeft: '32px' }}>{text}</span>;
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
          <Title level={4}>Balance Sheet</Title>
          <Space>
            <DatePicker
              placeholder="As on Date"
              value={asOnDate}
              onChange={setAsOnDate}
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
              <Button icon={<ReloadOutlined />} onClick={() => refetch()} title="Refresh" />
            )}
          </Space>
        </div>

        {error && <Alert message={error.message} type="error" showIcon />}

        <Spin spinning={isLoading}>
          {data ? (
            data.sections?.length > 0 ? (
              <Table columns={columns} dataSource={dataSource} pagination={false} size="middle" rowKey="key" />
            ) : (
              <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
                No data for the selected date.
              </div>
            )
          ) : (
            <div style={{ padding: 20, textAlign: 'center' }}>
              {!fetchParams ? 'Select a date and click Generate' : 'No data available'}
            </div>
          )}
        </Spin>
      </Space>
    </Card>
  );
};

export default BalanceSheet;