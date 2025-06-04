import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, List, Typography, Spin, message, Divider, Select } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import ReactMarkdown from 'react-markdown';
import axios from 'axios';

const { TextArea } = Input;
const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

export default function NLPInteraction() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modelType, setModelType] = useState('backend'); // 'backend' 或 'deepseek'
  const messagesEndRef = useRef(null);

  // 自动滚动到最新消息
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 添加欢迎消息
  useEffect(() => {
    setMessages([
      {
        type: 'system',
        content: '欢迎使用教育辅助可视分析系统的自然语言交互功能。您可以询问关于知识点掌握情况、学习行为模式和题目难度的问题，也可以请求生成分析报告。'
      }
    ]);
  }, []);

  // 处理查询提交
  const handleSubmit = async () => {
    if (!query.trim()) return;

    // 添加用户消息
    const userMessage = { type: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    
    // 清空输入框
    setQuery('');
    
    // 设置加载状态
    setLoading(true);
    
    try {
      let response;
      
      if (modelType === 'backend') {
        // 使用后端NLP服务
        response = await axios.post('/api/nlp/query', { query });
        
        // 添加系统回复
        const systemMessage = { 
          type: 'system', 
          content: response.data.content || '抱歉，我无法理解您的问题。',
          data: response.data
        };
        
        setMessages(prev => [...prev, systemMessage]);
      } else {
        // 使用本地Deepseek模型
        const deepseekResponse = await callDeepseekModel(query);
        
        // 添加系统回复
        const systemMessage = { 
          type: 'system', 
          content: deepseekResponse,
          model: 'deepseek'
        };
        
        setMessages(prev => [...prev, systemMessage]);
      }
    } catch (error) {
      console.error('查询处理失败:', error);
      message.error('查询处理失败，请稍后重试');
      
      // 添加错误消息
      const errorMessage = { 
        type: 'system', 
        content: '抱歉，处理您的请求时出现了错误。请稍后重试。',
        error: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  // 调用本地Deepseek模型
  const callDeepseekModel = async (prompt) => {
    try {
      const url = "http://localhost:11434/api/generate";
      
      const data = {
        model: "deepseek-r1:8b",
        prompt: prompt,
        stream: false,
      };
      
      const response = await axios.post(url, data);
      
      if (response.status === 200) {
        return response.data.response;
      } else {
        throw new Error(`请求失败，状态码: ${response.status}`);
      }
    } catch (error) {
      console.error('Deepseek模型调用失败:', error);
      throw error;
    }
  };

  // 渲染消息内容
  const renderMessageContent = (message) => {
    if (message.type === 'system' && message.data && message.data.type === 'report') {
      // 渲染报告链接
      return (
        <div>
          <div style={{ 
            background: '#f6f8fa', 
            border: '1px solid #e1e4e8', 
            borderRadius: '6px', 
            padding: '16px',
            marginBottom: '12px'
          }}>
            <ReactMarkdown
              components={{
                h1: ({children}) => <Typography.Title level={3} style={{marginTop: 0, color: '#1890ff'}}>{children}</Typography.Title>,
                h2: ({children}) => <Typography.Title level={4} style={{marginTop: 16, marginBottom: 8, color: '#1890ff'}}>{children}</Typography.Title>,
                h3: ({children}) => <Typography.Title level={5} style={{marginTop: 12, marginBottom: 6, color: '#1890ff'}}>{children}</Typography.Title>,
                p: ({children}) => <Paragraph style={{marginBottom: 8, lineHeight: '1.6'}}>{children}</Paragraph>,
                ul: ({children}) => <ul style={{paddingLeft: '20px', marginBottom: '8px'}}>{children}</ul>,
                ol: ({children}) => <ol style={{paddingLeft: '20px', marginBottom: '8px'}}>{children}</ol>,
                li: ({children}) => <li style={{marginBottom: '4px', lineHeight: '1.5'}}>{children}</li>,
                code: ({children, className}) => {
                  const isInline = !className;
                  return isInline ? (
                    <code style={{
                      background: '#f1f3f4',
                      padding: '2px 4px',
                      borderRadius: '3px',
                      fontSize: '0.9em',
                      color: '#d73a49'
                    }}>{children}</code>
                  ) : (
                    <pre style={{
                      background: '#f6f8fa',
                      border: '1px solid #e1e4e8',
                      borderRadius: '6px',
                      padding: '12px',
                      overflow: 'auto',
                      fontSize: '0.9em',
                      lineHeight: '1.4'
                    }}>
                      <code>{children}</code>
                    </pre>
                  );
                },
                blockquote: ({children}) => (
                  <blockquote style={{
                    borderLeft: '4px solid #dfe2e5',
                    paddingLeft: '16px',
                    margin: '16px 0',
                    color: '#6a737d',
                    fontStyle: 'italic'
                  }}>{children}</blockquote>
                ),
                table: ({children}) => (
                  <div style={{overflowX: 'auto', marginBottom: '16px'}}>
                    <table style={{
                      borderCollapse: 'collapse',
                      width: '100%',
                      border: '1px solid #e1e4e8'
                    }}>{children}</table>
                  </div>
                ),
                th: ({children}) => (
                  <th style={{
                    border: '1px solid #e1e4e8',
                    padding: '8px 12px',
                    background: '#f6f8fa',
                    fontWeight: 'bold',
                    textAlign: 'left'
                  }}>{children}</th>
                ),
                td: ({children}) => (
                  <td style={{
                    border: '1px solid #e1e4e8',
                    padding: '8px 12px'
                  }}>{children}</td>
                ),
                strong: ({children}) => <strong style={{color: '#24292e', fontWeight: '600'}}>{children}</strong>,
                em: ({children}) => <em style={{color: '#6a737d'}}>{children}</em>,
                hr: () => <Divider style={{margin: '16px 0'}} />
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
          <Button type="primary" href={`/api/report/download/${message.data.report_path.split('/').pop()}`} target="_blank">
            下载报告
          </Button>
        </div>
      );
    }
    
    if (message.type === 'system') {
      // 系统消息使用Markdown渲染
      return (
        <div style={{ 
          background: message.error ? '#fff2f0' : '#f6f8fa', 
          border: `1px solid ${message.error ? '#ffccc7' : '#e1e4e8'}`, 
          borderRadius: '6px', 
          padding: '16px'
        }}>
          <ReactMarkdown
            components={{
              h1: ({children}) => <Typography.Title level={3} style={{marginTop: 0, color: '#1890ff'}}>{children}</Typography.Title>,
              h2: ({children}) => <Typography.Title level={4} style={{marginTop: 16, marginBottom: 8, color: '#1890ff'}}>{children}</Typography.Title>,
              h3: ({children}) => <Typography.Title level={5} style={{marginTop: 12, marginBottom: 6, color: '#1890ff'}}>{children}</Typography.Title>,
              p: ({children}) => <Paragraph style={{marginBottom: 8, lineHeight: '1.6'}}>{children}</Paragraph>,
              ul: ({children}) => <ul style={{paddingLeft: '20px', marginBottom: '8px'}}>{children}</ul>,
              ol: ({children}) => <ol style={{paddingLeft: '20px', marginBottom: '8px'}}>{children}</ol>,
              li: ({children}) => <li style={{marginBottom: '4px', lineHeight: '1.5'}}>{children}</li>,
              code: ({children, className}) => {
                const isInline = !className;
                return isInline ? (
                  <code style={{
                    background: '#f1f3f4',
                    padding: '2px 4px',
                    borderRadius: '3px',
                    fontSize: '0.9em',
                    color: '#d73a49'
                  }}>{children}</code>
                ) : (
                  <pre style={{
                    background: '#f6f8fa',
                    border: '1px solid #e1e4e8',
                    borderRadius: '6px',
                    padding: '12px',
                    overflow: 'auto',
                    fontSize: '0.9em',
                    lineHeight: '1.4'
                  }}>
                    <code>{children}</code>
                  </pre>
                );
              },
              blockquote: ({children}) => (
                <blockquote style={{
                  borderLeft: '4px solid #dfe2e5',
                  paddingLeft: '16px',
                  margin: '16px 0',
                  color: '#6a737d',
                  fontStyle: 'italic'
                }}>{children}</blockquote>
              ),
              table: ({children}) => (
                <div style={{overflowX: 'auto', marginBottom: '16px'}}>
                  <table style={{
                    borderCollapse: 'collapse',
                    width: '100%',
                    border: '1px solid #e1e4e8'
                  }}>{children}</table>
                </div>
              ),
              th: ({children}) => (
                <th style={{
                  border: '1px solid #e1e4e8',
                  padding: '8px 12px',
                  background: '#f6f8fa',
                  fontWeight: 'bold',
                  textAlign: 'left'
                }}>{children}</th>
              ),
              td: ({children}) => (
                <td style={{
                  border: '1px solid #e1e4e8',
                  padding: '8px 12px'
                }}>{children}</td>
              ),
              strong: ({children}) => <strong style={{color: '#24292e', fontWeight: '600'}}>{children}</strong>,
              em: ({children}) => <em style={{color: '#6a737d'}}>{children}</em>,
              hr: () => <Divider style={{margin: '16px 0'}} />
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      );
    }
    
    // 用户消息保持原样
    return <Paragraph style={{lineHeight: '1.6'}}>{message.content}</Paragraph>;
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Card
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4}>自然语言交互</Title>
            <Select 
              value={modelType} 
              onChange={setModelType} 
              style={{ width: 200 }}
            >
              <Option value="backend">后端NLP服务</Option>
              <Option value="deepseek">本地Deepseek模型</Option>
            </Select>
          </div>
        }
        style={{ marginBottom: 20 }}
      >
        <Paragraph>
          您可以使用自然语言向系统提问，获取关于学生学习情况的分析结果。
          例如：
        </Paragraph>
        <ul>
          <li>"分析学生ID:12345的知识点掌握情况"</li>
          <li>"查看学生的学习行为模式"</li>
          <li>"生成一份PDF格式的知识点掌握报告"</li>
        </ul>
      </Card>
      
      <Card
        style={{ 
          height: '500px', 
          marginBottom: 20, 
          display: 'flex', 
          flexDirection: 'column' 
        }}
        bodyStyle={{ 
          flex: 1, 
          overflow: 'auto', 
          padding: '12px 24px',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <List
          itemLayout="horizontal"
          dataSource={messages}
          style={{ flex: 1 }}
          renderItem={(message) => (
            <List.Item style={{ padding: '8px 0' }}>
              <List.Item.Meta
                avatar={
                  message.type === 'user' ? 
                  <UserOutlined style={{ fontSize: '24px', color: '#1890ff' }} /> : 
                  <RobotOutlined style={{ fontSize: '24px', color: '#52c41a' }} />
                }
                title={message.type === 'user' ? '您' : '系统'}
                description={renderMessageContent(message)}
              />
            </List.Item>
          )}
        />
        <div ref={messagesEndRef} />
        
        {loading && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <Spin tip="正在处理您的请求..." />
          </div>
        )}
      </Card>
      
      <div style={{ display: 'flex' }}>
        <TextArea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="请输入您的问题..."
          autoSize={{ minRows: 2, maxRows: 6 }}
          onPressEnter={(e) => {
            if (!e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          style={{ flex: 1, marginRight: 8 }}
        />
        <Button 
          type="primary" 
          icon={<SendOutlined />} 
          onClick={handleSubmit}
          loading={loading}
          style={{ height: 'auto' }}
        >
          发送
        </Button>
      </div>
    </div>
  );
}
