import React, { useState, useEffect, useRef } from 'react';
import { Input, Button, Card, List, Typography, Spin, message, Divider, Select } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
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
          <Paragraph>{message.content}</Paragraph>
          <Button type="primary" href={`/api/report/download/${message.data.report_path.split('/').pop()}`} target="_blank">
            下载报告
          </Button>
        </div>
      );
    }
    
    // 普通文本消息
    return <Paragraph>{message.content}</Paragraph>;
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
