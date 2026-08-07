import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'

const StudentReports = () => {
  const navigate = useNavigate()
  return (
    <Result
      status="info"
      title="Student Reports"
      subTitle="This section is under construction."
      extra={<Button type="primary" onClick={() => navigate('/students')}>Back to Overview</Button>}
    />
  )
}

export default StudentReports