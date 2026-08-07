import { useParams, useNavigate } from 'react-router-dom'
import { Card, Descriptions, Table, Button, Space, Spin, Typography } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useJournalEntry } from '../../hooks/useAccounts'
import { useTheme } from '../../contexts/ThemeContext'
import dayjs from 'dayjs'

const { Title } = Typography

const JournalEntryDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { theme } = useTheme()
  const primaryColor = theme?.primary_color || '#0D47A1'
  const fontBody = theme?.font_body || 'Montserrat'

  const { data: entry, isLoading } = useJournalEntry(id)

  if (isLoading) return <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
  if (!entry) return <Card><p>Journal entry not found</p><Button onClick={() => navigate('/accounts/journal')}>Back</Button></Card>

  const columns = [
    { title: 'Account', dataIndex: ['chart_of_accounts', 'account_name'] },
    { title: 'Code', dataIndex: ['chart_of_accounts', 'account_code'] },
    { title: 'Debit', dataIndex: 'debit', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Credit', dataIndex: 'credit', render: (v) => `₹${(v || 0).toFixed(2)}` },
    { title: 'Description', dataIndex: 'description' },
  ]

  return (
    <div style={{ fontFamily: fontBody, padding: 16 }}>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/accounts/journal')}>Back</Button>
      </Space>
      <Card bordered={false} style={{ borderTop: `4px solid ${primaryColor}` }}>
        <Title level={3}>Journal Entry</Title>
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label="Date">{dayjs(entry.entry_date).format('DD/MM/YYYY')}</Descriptions.Item>
          <Descriptions.Item label="Reference">{entry.reference || '-'}</Descriptions.Item>
          <Descriptions.Item label="Description">{entry.description || '-'}</Descriptions.Item>
          <Descriptions.Item label="Posted">{entry.is_posted ? 'Yes' : 'No'}</Descriptions.Item>
        </Descriptions>
        <Table
          dataSource={entry.journal_entry_lines || []}
          columns={columns}
          rowKey={(record) => record.id || Math.random().toString(36)}
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default JournalEntryDetail