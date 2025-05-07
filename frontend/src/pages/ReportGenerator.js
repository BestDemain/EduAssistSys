import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Select, Button, Form, Checkbox, Radio, Spin, Alert, Typography, message, Tabs, Modal, Table, Tag, Tooltip, Space, Divider } from 'antd';
import { DownloadOutlined, FileTextOutlined, EyeOutlined, HistoryOutlined, SettingOutlined, DeleteOutlined } from '@ant-design/icons';
import axios from 'axios';
import ReactECharts from 'echarts-for-react';

const { Option } = Select;
const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

const ReportGenerator = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [students, setStudents] = useState([]);
  const [reportPath, setReportPath] = useState(null);
  const [reportHistory, setReportHistory] = useState([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [activeTab, setActiveTab] = useState('generator');
  const [templates, setTemplates] = useState([]);
  
  // 加载初始数据
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        
        // 获取学生数据
        const studentsResponse = await axios.get('/api/students');
        setStudents(studentsResponse.data);
        
        // 获取报告模板数据
        const templatesResponse = await axios.get('/api/report/templates');
        if (templatesResponse.data.status === 'success') {
          setTemplates(templatesResponse.data.templates || []);
        }
        
        // 获取报告历史记录
        const historyResponse = await axios.get('/api/report/history');
        if (historyResponse.data.status === 'success') {
          setReportHistory(historyResponse.data.reports || []);
        }
        
        setLoading(false);
      } catch (err) {
        console.error('加载初始数据失败:', err);
        setError('加载初始数据失败，请稍后重试');
        setLoading(false);
      }
    };
    
    fetchInitialData();
  }, []);
  
  // 生成报告
  const generateReport = async (values) => {
    try {
      setGenerating(true);
      setError(null);
      setReportPath(null);
      
      const { reportType, studentId, format, content, templateId, customOptions } = values;
      
      const response = await axios.post('/api/report/generate', {
        report_type: reportType,
        student_id: studentId === 'all' ? null : studentId,
        format: format,
        content: content || [],
        template_id: templateId,
        custom_options: customOptions || {}
      });
      
      if (response.data.status === 'success') {
        setReportPath(response.data.report_path);
        message.success('报告生成成功！');
        
        // 刷新报告历史记录
        const historyResponse = await axios.get('/api/report/history');
        if (historyResponse.data.status === 'success') {
          setReportHistory(historyResponse.data.reports || []);
        }
      } else {
        setError(response.data.message || '生成报告失败');
        message.error('报告生成失败！');
      }
      
      setGenerating(false);
    } catch (err) {
      console.error('生成报告失败:', err);
      setError('生成报告失败，请稍后重试');
      message.error('报告生成失败！');
      setGenerating(false);
    }
  };
  
  // 下载报告
  const downloadReport = (path) => {
    if (!path) return;
    
    const filename = path.split('/').pop();
    window.open(`/api/report/download/${filename}`, '_blank');
  };
  
  // 预览报告
  const previewReport = async (path) => {
    if (!path) return;
    const filename = path.split('/').pop();
    window.open(`/api/report/preview/${filename}`, '_blank');
  };
  
  // 删除报告
  const deleteReport = async (reportId) => {
    try {
      const response = await axios.delete(`/api/report/${reportId}`);
      
      if (response.data.status === 'success') {
        message.success('报告删除成功！');
        
        // 刷新报告历史记录
        const historyResponse = await axios.get('/api/report/history');
        if (historyResponse.data.status === 'success') {
          setReportHistory(historyResponse.data.reports || []);
        }
      } else {
        message.error('删除报告失败！');
      }
    } catch (err) {
      console.error('删除报告失败:', err);
      message.error('删除报告失败，请稍后重试');
    }
  };
  
  // 生成预览图表
  const getPreviewChartOption = (chartData) => {
    if (!chartData || !chartData.type) return {};
    
    switch (chartData.type) {
      case 'pie':
        return {
          title: {
            text: chartData.title || '图表预览',
            left: 'center'
          },
          tooltip: {
            trigger: 'item',
            formatter: '{a} <br/>{b}: {c} ({d}%)'
          },
          series: [
            {
              name: chartData.seriesName || '数据',
              type: 'pie',
              radius: '60%',
              center: ['50%', '50%'],
              data: chartData.data || [],
              emphasis: {
                itemStyle: {
                  shadowBlur: 10,
                  shadowOffsetX: 0,
                  shadowColor: 'rgba(0, 0, 0, 0.5)'
                }
              }
            }
          ]
        };
      case 'bar':
        return {
          title: {
            text: chartData.title || '图表预览',
            left: 'center'
          },
          tooltip: {
            trigger: 'axis',
            axisPointer: {
              type: 'shadow'
            }
          },
          xAxis: {
            type: 'category',
            data: chartData.xAxisData || []
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              name: chartData.seriesName || '数据',
              type: 'bar',
              data: chartData.data || [],
              itemStyle: {
                color: '#1890ff'
              }
            }
          ]
        };
      case 'line':
        return {
          title: {
            text: chartData.title || '图表预览',
            left: 'center'
          },
          tooltip: {
            trigger: 'axis'
          },
          xAxis: {
            type: 'category',
            data: chartData.xAxisData || []
          },
          yAxis: {
            type: 'value'
          },
          series: [
            {
              name: chartData.seriesName || '数据',
              type: 'line',
              data: chartData.data || [],
              itemStyle: {
                color: '#1890ff'
              }
            }
          ]
        };
      default:
        return {};
    }
  };
  
  // 报告历史记录表格列定义
  const historyColumns = [
    {
      title: '报告名称',
      dataIndex: 'report_name',
      key: 'report_name',
      ellipsis: true,
      render: (text, record) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      )
    },
    {
      title: '报告类型',
      dataIndex: 'report_type',
      key: 'report_type',
      render: (text) => {
        const typeMap = {
          'general': '综合分析报告',
          'knowledge': '知识点掌握报告',
          'behavior': '学习行为报告',
          'difficulty': '题目难度报告'
        };
        return typeMap[text] || text;
      }
    },
    {
      title: '学生',
      dataIndex: 'student_id',
      key: 'student_id',
      render: (text) => text || '所有学生'
    },
    {
      title: '格式',
      dataIndex: 'format',
      key: 'format',
      render: (text) => (
        <Tag color="blue">{text.toUpperCase()}</Tag>
      )
    },
    {
      title: '生成时间',
      dataIndex: 'created_at',
      key: 'created_at',
      sorter: (a, b) => new Date(a.created_at) - new Date(b.created_at)
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => previewReport(record.report_path)}
          >
            预览
          </Button>
          <Button 
            type="link" 
            icon={<DownloadOutlined />} 
            onClick={() => downloadReport(record.report_path)}
          >
            下载
          </Button>
          <Button 
            type="link" 
            danger 
            icon={<DeleteOutlined />} 
            onClick={() => deleteReport(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];
  
  return (
    <div>
      <Title level={2}>报告生成</Title>
      <Paragraph>
        本模块可生成包含自然语言和图表元素的分析报告，支持通过交互式操作指定报告的格式、内容和范围。
      </Paragraph>
      
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane 
          tab={<span><FileTextOutlined />报告生成器</span>} 
          key="generator"
        >
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={generateReport}
              initialValues={{
                reportType: 'general',
                format: 'pdf',
                content: ['knowledge', 'behavior', 'difficulty'],
                templateId: templates.length > 0 ? templates[0].id : undefined
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="reportType"
                    label="报告类型"
                    rules={[{ required: true, message: '请选择报告类型' }]}
                  >
                    <Radio.Group>
                      <Radio value="general">综合分析报告</Radio>
                      <Radio value="knowledge">知识点掌握报告</Radio>
                      <Radio value="behavior">学习行为报告</Radio>
                      <Radio value="difficulty">题目难度报告</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    name="studentId"
                    label="学生"
                    rules={[{ required: true, message: '请选择学生' }]}
                    initialValue="all"
                  >
                    <Select placeholder="选择学生" loading={loading}>
                      <Option value="all">所有学生</Option>
                      {students.map(student => (
                        <Option key={student.student_ID} value={student.student_ID}>
                          {student.student_ID} {student.sex ? `(${student.sex})` : ''}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item
                    name="format"
                    label="报告格式"
                    rules={[{ required: true, message: '请选择报告格式' }]}
                  >
                    <Radio.Group>
                      <Radio value="pdf">PDF</Radio>
                      <Radio value="html">HTML</Radio>
                      <Radio value="docx">Word</Radio>
                      <Radio value="xlsx">Excel</Radio>
                    </Radio.Group>
                  </Form.Item>
                </Col>
                
                <Col xs={24} md={12}>
                  <Form.Item
                    name="templateId"
                    label="报告模板"
                    rules={[{ required: true, message: '请选择报告模板' }]}
                  >
                    <Select placeholder="选择模板" loading={loading}>
                      {templates.map(template => (
                        <Option key={template.id} value={template.id}>
                          {template.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              <Divider orientation="left">报告内容</Divider>
              
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item
                    name="content"
                    label="分析内容"
                  >
                    <Checkbox.Group style={{ width: '100%' }}>
                      <Row gutter={[16, 16]}>
                        <Col span={8}>
                          <Card size="small" hoverable>
                            <Checkbox value="knowledge">知识点分析</Checkbox>
                            <div style={{ marginTop: 8, marginLeft: 24 }}>
                              <Text type="secondary">包含知识点掌握度、薄弱点等分析</Text>
                            </div>
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card size="small" hoverable>
                            <Checkbox value="behavior">行为分析</Checkbox>
                            <div style={{ marginTop: 8, marginLeft: 24 }}>
                              <Text type="secondary">包含学习行为、答题习惯等分析</Text>
                            </div>
                          </Card>
                        </Col>
                        <Col span={8}>
                          <Card size="small" hoverable>
                            <Checkbox value="difficulty">难度分析</Checkbox>
                            <div style={{ marginTop: 8, marginLeft: 24 }}>
                              <Text type="secondary">包含题目难度、不合理题目等分析</Text>
                            </div>
                          </Card>
                        </Col>
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item>
                <Space>
                  <Button type="primary" htmlType="submit" loading={generating}>
                    生成报告
                  </Button>
                  <Button 
                    icon={<SettingOutlined />}
                    onClick={() => message.info('高级设置功能即将上线')}
                  >
                    高级设置
                  </Button>
                </Space>
              </Form.Item>
            </Form>
            
            {error && <Alert message="错误" description={error} type="error" showIcon style={{ marginTop: 16 }} />}
            
            {reportPath && (
              <Card style={{ marginTop: 16, textAlign: 'center' }}>
                <FileTextOutlined style={{ fontSize: 48, color: '#1890ff', marginBottom: 16 }} />
                <Title level={4}>报告已生成</Title>
                <Space style={{ marginTop: 16 }}>
                  <Button 
                    type="primary" 
                    icon={<DownloadOutlined />} 
                    onClick={() => downloadReport(reportPath)}
                  >
                    下载报告
                  </Button>
                  <Button 
                    icon={<EyeOutlined />} 
                    onClick={() => previewReport(reportPath)}
                  >
                    预览报告
                  </Button>
                </Space>
              </Card>
            )}
          </Card>
        </TabPane>
        
        <TabPane 
          tab={<span><HistoryOutlined />报告历史</span>} 
          key="history"
        >
          <Card>
            <Table 
              columns={historyColumns} 
              dataSource={reportHistory} 
              rowKey="id" 
              loading={loading}
              pagination={{ pageSize: 10 }}
            />
          </Card>
        </TabPane>
      </Tabs>
      
      {/* 报告预览模态框 */}
      <Modal
        title="报告预览"
        visible={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button 
            key="download" 
            type="primary" 
            icon={<DownloadOutlined />} 
            onClick={() => {
              downloadReport(previewData?.report_path);
              setPreviewVisible(false);
            }}
          >
            下载报告
          </Button>
        ]}
      >
        {previewData ? (
          <div>
            <Title level={3} style={{ textAlign: 'center' }}>{previewData.title}</Title>
            
            {previewData.sections?.map((section, index) => (
              <div key={index} style={{ marginBottom: 24 }}>
                <Title level={4}>{section.title}</Title>
                <Paragraph>{section.content}</Paragraph>
                
                {section.charts?.map((chart, chartIndex) => (
                  <div key={chartIndex} style={{ marginTop: 16, marginBottom: 16 }}>
                    <ReactECharts 
                      option={getPreviewChartOption(chart)} 
                      style={{ height: 300 }} 
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <Spin tip="加载预览数据..." />
        )}
      </Modal>
    </div>
  );
};

export default ReportGenerator;