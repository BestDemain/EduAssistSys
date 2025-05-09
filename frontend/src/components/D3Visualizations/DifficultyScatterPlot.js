import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 题目难度散点图组件
 * 使用D3.js实现的散点图，展示题目难度与正确率的关系
 * @param {Object} props
 * @param {Array} props.data 题目数据数组
 * @param {string} props.title 图表标题
 */
const DifficultyScatterPlot = ({ data, title = '题目难度与正确率关系图' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 清除之前的图表
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置画布尺寸
    const width = 700;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG元素
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建X轴比例尺（正确率）
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth]);

    // 创建Y轴比例尺（平均用时）
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.avg_time_consume) * 1.1])
      .range([innerHeight, 0]);

    // 创建颜色比例尺
    const colorScale = d3.scaleLinear()
      .domain([0, 0.5, 1])
      .range(['#ff4d4f', '#faad14', '#52c41a']);

    // 创建大小比例尺
    const sizeScale = d3.scaleLinear()
      .domain([d3.min(data, d => d.submit_count), d3.max(data, d => d.submit_count)])
      .range([5, 15]);

    // 绘制X轴
    svg.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${(d * 100).toFixed(0)}%`))
      .selectAll('text')
      .style('text-anchor', 'middle');

    // 添加X轴标签
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .style('text-anchor', 'middle')
      .text('正确率');

    // 绘制Y轴
    svg.append('g')
      .call(d3.axisLeft(yScale));

    // 添加Y轴标签
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('平均用时(秒)');

    // 添加网格线
    svg.append('g')
      .attr('class', 'grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    svg.append('g')
      .attr('class', 'grid')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    // 绘制散点
    svg.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.correct_rate))
      .attr('cy', d => yScale(d.avg_time_consume))
      .attr('r', d => sizeScale(d.submit_count))
      .style('fill', d => colorScale(d.correct_rate))
      .style('opacity', 0.7)
      .style('stroke', '#fff')
      .style('stroke-width', 1)
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', d => sizeScale(d.submit_count) + 3)
          .style('opacity', 1);

        // 显示提示框
        tooltip.transition()
          .duration(200)
          .style('opacity', .9);
        tooltip.html(`题目ID: ${d.title_id}<br/>知识点: ${d.knowledge}<br/>正确率: ${(d.correct_rate * 100).toFixed(1)}%<br/>平均用时: ${d.avg_time_consume.toFixed(1)}秒<br/>提交次数: ${d.submit_count}`)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 28) + 'px');
      })
      .on('mouseout', function(d) {
        d3.select(this)
          .transition()
          .duration(500)
          .attr('r', d => sizeScale(d.submit_count))
          .style('opacity', 0.7);

        // 隐藏提示框
        tooltip.transition()
          .duration(500)
          .style('opacity', 0);
      });

    // 添加标题
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(title);

    // 添加图例 - 颜色
    const colorLegend = svg.append('g')
      .attr('transform', `translate(${innerWidth - 150}, -20)`);

    const colorLegendData = [
      { color: '#ff4d4f', text: '低正确率' },
      { color: '#faad14', text: '中正确率' },
      { color: '#52c41a', text: '高正确率' }
    ];

    colorLegendData.forEach((item, i) => {
      const legendRow = colorLegend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);
      
      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', item.color);
      
      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(item.text)
        .style('font-size', '12px');
    });

    // 添加图例 - 大小
    const sizeLegend = svg.append('g')
      .attr('transform', `translate(10, -20)`);

    const sizeLegendData = [
      { size: sizeScale(d3.min(data, d => d.submit_count)), text: '少量提交' },
      { size: sizeScale(d3.max(data, d => d.submit_count)), text: '大量提交' }
    ];

    sizeLegendData.forEach((item, i) => {
      const legendRow = sizeLegend.append('g')
        .attr('transform', `translate(${i * 100}, 0)`);
      
      legendRow.append('circle')
        .attr('cx', 7.5)
        .attr('cy', 7.5)
        .attr('r', item.size)
        .attr('fill', '#666');
      
      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(item.text)
        .style('font-size', '12px');
    });

    // 创建提示框
    const tooltip = d3.select('body').append('div')
      .attr('class', 'd3-tooltip')
      .style('opacity', 0)
      .style('position', 'absolute')
      .style('text-align', 'center')
      .style('padding', '8px')
      .style('font-size', '12px')
      .style('background', 'rgba(0, 0, 0, 0.75)')
      .style('color', '#fff')
      .style('border-radius', '4px')
      .style('pointer-events', 'none');

    // 清理函数
    return () => {
      d3.select('body').selectAll('.d3-tooltip').remove();
    };
  }, [data, title]);

  return (
    <Card style={{ marginTop: 16 }}>
      <Title level={4}>{title}</Title>
      <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <svg ref={svgRef}></svg>
      </div>
    </Card>
  );
};

export default DifficultyScatterPlot;