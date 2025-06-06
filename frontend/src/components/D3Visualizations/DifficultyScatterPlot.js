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
      .attr('height', height);

    // 创建主绘图区域
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建缩放行为
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5]) // 缩放范围：0.5倍到5倍
      .on('zoom', (event) => {
        const { transform } = event;
        
        // 更新比例尺
        const newXScale = transform.rescaleX(xScale);
        const newYScale = transform.rescaleY(yScale);
        
        // 更新坐标轴
        g.select('.x-axis')
          .call(d3.axisBottom(newXScale).tickFormat(d => `${(d * 100).toFixed(0)}%`));
        g.select('.y-axis')
          .call(d3.axisLeft(newYScale).tickFormat(d => `${(d * 100).toFixed(0)}%`));
        
        // 更新网格线
        g.select('.x-grid')
          .call(
            d3.axisBottom(newXScale)
              .tickSize(-innerHeight)
              .tickFormat('')
          )
          .selectAll('line')
          .style('stroke', '#e0e0e0')
          .style('stroke-opacity', 0.7);
        
        g.select('.y-grid')
          .call(
            d3.axisLeft(newYScale)
              .tickSize(-innerWidth)
              .tickFormat('')
          )
          .selectAll('line')
          .style('stroke', '#e0e0e0')
          .style('stroke-opacity', 0.7);
        
        // 更新散点位置
        g.selectAll('.dot')
          .attr('cx', d => newXScale(d.avg_mastery || 0))
          .attr('cy', d => newYScale(d.correct_rate));
      });

    // 应用缩放行为到SVG
    svg.call(zoom);

    // 创建X轴比例尺（掌握程度）
    const xScale = d3.scaleLinear()
      .domain([0, 1])
      .range([0, innerWidth]);

    // 创建Y轴比例尺（正确率）
    const yScale = d3.scaleLinear()
      .domain([0, 1])
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
    g.append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${(d * 100).toFixed(0)}%`))
      .selectAll('text')
      .style('text-anchor', 'middle');

    // 添加X轴标签
    g.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight + margin.bottom - 10)
      .style('text-anchor', 'middle')
      .text('平均掌握程度');

    // 绘制Y轴
    g.append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale).tickFormat(d => `${(d * 100).toFixed(0)}%`));

    // 添加Y轴标签
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -margin.left + 15)
      .attr('x', -innerHeight / 2)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('正确率');

    // 添加网格线
    g.append('g')
      .attr('class', 'x-grid')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale)
          .tickSize(-innerHeight)
          .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    g.append('g')
      .attr('class', 'y-grid')
      .call(
        d3.axisLeft(yScale)
          .tickSize(-innerWidth)
          .tickFormat('')
      )
      .selectAll('line')
      .style('stroke', '#e0e0e0')
      .style('stroke-opacity', 0.7);

    // 绘制散点
    g.selectAll('.dot')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'dot')
      .attr('cx', d => xScale(d.avg_mastery || 0))
      .attr('cy', d => yScale(d.correct_rate))
      .attr('r', d => sizeScale(d.submit_count))
      .style('fill', d => {
        // 根据掌握程度与正确率的差异设置颜色
        const mastery = (d.avg_mastery || 0) * 100;
        const correctRate = d.correct_rate * 100;
        const diff = mastery - correctRate;
        
        if (diff > 20) return '#ff4d4f'; // 红色：掌握程度高但正确率低
        if (diff > 10) return '#faad14'; // 黄色：掌握程度略高于正确率
        if (diff < -20) return '#722ed1'; // 紫色：正确率高但掌握程度低
        return '#52c41a'; // 绿色：掌握程度与正确率匹配良好
      })
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
        tooltip.html(`题目ID: ${d.title_id}<br/>知识点: ${d.knowledge}<br/>平均掌握程度: ${((d.avg_mastery || 0) * 100).toFixed(1)}%<br/>正确率: ${(d.correct_rate * 100).toFixed(1)}%<br/>提交次数: ${d.submit_count}`)
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
    const colorLegend = g.append('g')
      .attr('class', 'color-legend')
      .attr('transform', `translate(${innerWidth - 200}, 20)`);

    // 添加颜色图例标题
    colorLegend.append('text')
      .attr('x', 0)
      .attr('y', -10)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('掌握度与正确率关系');

    const colorLegendData = [
      { color: '#ff4d4f', label: '掌握度高但正确率低' },
      { color: '#faad14', label: '掌握度略高于正确率' },
      { color: '#722ed1', label: '正确率高但掌握度低' },
      { color: '#52c41a', label: '掌握度与正确率匹配' }
    ];

    colorLegend.selectAll('.color-legend-item')
      .data(colorLegendData)
      .enter().append('g')
      .attr('class', 'color-legend-item')
      .attr('transform', (d, i) => `translate(0, ${i * 20})`)
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('cx', 8)
          .attr('cy', 0)
          .attr('r', 6)
          .style('fill', d.color);
        g.append('text')
          .attr('x', 20)
          .attr('y', 0)
          .attr('dy', '0.35em')
          .style('font-size', '12px')
          .text(d.label);
      });

    // 添加大小图例
    const sizeLegend = g.append('g')
      .attr('class', 'size-legend')
      .attr('transform', `translate(20, 100)`);

    // 添加大小图例标题
    sizeLegend.append('text')
      .attr('x', 0)
      .attr('y', -90)
      .style('font-size', '12px')
      .style('font-weight', 'bold')
      .text('提交次数');

    const sizeLegendData = [
      { size: 5, label: '少' },
      { size: 10, label: '中' },
      { size: 15, label: '多' }
    ];

    sizeLegend.selectAll('.size-legend-item')
      .data(sizeLegendData)
      .enter().append('g')
      .attr('class', 'size-legend-item')
      .attr('transform', (d, i) => `translate(${i * 40}, 10)`)
      .each(function(d) {
        const g = d3.select(this);
        g.append('circle')
          .attr('cx', 0)
          .attr('cy', -60)
          .attr('r', d.size)
          .style('fill', '#1890ff')
          .style('opacity', 0.7);
        g.append('text')
          .attr('x', 0)
          .attr('y', -80)
          .attr('text-anchor', 'middle')
          .style('font-size', '10px')
          .text(d.label);
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