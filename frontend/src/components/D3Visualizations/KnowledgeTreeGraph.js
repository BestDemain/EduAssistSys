import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { Card, Typography } from 'antd';

const { Title } = Typography;

/**
 * 知识点掌握程度树图组件
 * 使用D3.js实现的力导引图，展示知识点及其子知识点的掌握程度
 * @param {Object} props
 * @param {Object} props.data 知识点数据
 * @param {number} props.width 图表宽度
 * @param {number} props.height 图表高度
 */
const KnowledgeTreeGraph = ({ data, width = 1200, height = 800 }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data) {
      console.log('KnowledgeTreeGraph组件：数据为空，无法渲染图表');
      return;
    }

    // 清除之前的图表
    d3.select(svgRef.current).selectAll('*').remove();

    // 设置画布尺寸和边距 - 增加边距确保文本不会被裁剪
    const margin = { top: 100, right: -350, bottom: 80, left: 250 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // 创建SVG元素
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 创建缩放行为
    const zoom = d3.zoom()
      .scaleExtent([0.5, 5]) // 设置缩放范围，最小0.5倍，最大5倍
      .on('zoom', (event) => {
        // 缩放时更新所有元素的变换
        svg.attr('transform', event.transform);
      });

    // 将缩放行为应用到SVG容器
    d3.select(svgRef.current).call(zoom);

    // 添加标题
    svg.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', -60)
      .attr('text-anchor', 'middle')
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .text('知识点掌握度树图');

    // 处理数据，构建力导引图所需的节点和连接
    const nodes = [];
    const links = [];
    const knowledgePoints = Object.keys(data);

    // 为每个知识点创建节点和连接
    knowledgePoints.forEach((knowledge, index) => {
      const knowledgeData = data[knowledge];
      const subKnowledgePoints = knowledgeData.sub_knowledge || {};
      
      // 创建知识点节点
      const knowledgeNode = {
        id: knowledge,
        name: `知识点组 ${index + 1}`,
        type: 'knowledge',
        mastery: knowledgeData.correct_rate,
        group: index // 用于分组
      };
      
      nodes.push(knowledgeNode);
      
      // 添加子知识点节点和连接
      Object.keys(subKnowledgePoints).forEach(subKnowledge => {
        const subKnowledgeData = subKnowledgePoints[subKnowledge];
        const subNode = {
          id: subKnowledge,
          type: 'sub_knowledge',
          mastery: subKnowledgeData.correct_rate,
          parent: knowledge,
          group: index // 与父节点同组
        };
        
        nodes.push(subNode);
        
        // 添加从知识点到子知识点的连接
        links.push({
          source: knowledge,
          target: subKnowledge,
          value: 1
        });
      });
    });

    // 定义颜色比例尺 - 根据节点类型设置颜色
    const nodeColorScale = d3.scaleOrdinal()
      .domain(['knowledge', 'sub_knowledge'])
      .range(['#1890ff', '#fa8c16']);

    // 定义透明度比例尺 - 根据掌握程度设置透明度
    const opacityScale = d3.scaleLinear()
      .domain([0, 0.25, 0.4, 1])
      .range([0.1, 0.3, 0.8, 1]);

    // 计算每个组的节点数量，用于布局
    const groupSizes = {};
    nodes.forEach(node => {
      if (!groupSizes[node.group]) {
        groupSizes[node.group] = 0;
      }
      groupSizes[node.group]++;
    });

    // 创建力导引模拟
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(60))
      .force('charge', d3.forceManyBody().strength(-120))
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2).strength(0.05))
      .force('collision', d3.forceCollide().radius(d => d.type === 'knowledge' ? 18 : 12).strength(0.8))
      .force('x', d3.forceX().strength(0.5).x(d => {
        // 根据组号分散不同知识点树 - 使用更均匀的网格布局
        const groupCount = knowledgePoints.length;
        const cols = Math.min(4, groupCount);
        const colWidth = innerWidth / cols;
        
        // 计算列位置，确保均匀分布
        const col = d.group % cols;
        return col * colWidth + colWidth * 0.5;
      }))
      .force('y', d3.forceY().strength(0.5).y(d => {
        // 根据组号分散不同知识点树 - 使用更均匀的网格布局
        const groupCount = knowledgePoints.length;
        const cols = Math.min(4, groupCount);
        const rows = Math.ceil(groupCount / cols);
        const rowHeight = innerHeight / rows;
        
        // 计算行位置，确保均匀分布
        const row = Math.floor(d.group / cols);
        return row * rowHeight + rowHeight * 0.5;
      }));

    // 绘制连接线
    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', 1.5);

    // 创建节点组
    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // 添加节点圆圈 - 使用透明度表示掌握程度
    node.append('circle')
      .attr('r', d => d.type === 'knowledge' ? 15 : 10) // 减小节点大小
      .attr('fill', d => nodeColorScale(d.type))
      .attr('fill-opacity', d => opacityScale(d.mastery))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5);

    // 添加节点ID文本 - 移到节点外部
    node.append('text')
      .attr('dy', 0)
      .attr('dx', d => d.type === 'knowledge' ? 20 : 15) // 文本放在节点右侧
      .attr('text-anchor', 'start')
      .attr('fill', '#333')
      .attr('font-size', d => d.type === 'knowledge' ? '12px' : '10px')
      .text(d => {
        if (d.type === 'knowledge') {
          return d.id.substring(0, 6);
        } else {
          const parts = d.id.split('_');
          return parts.length > 1 ? parts[1] : d.id.substring(0, 6);
        }
      });

    // 添加掌握度文本 - 移到节点外部，放在ID文本下方
    node.append('text')
      .attr('dy', '1em')
      .attr('dx', d => d.type === 'knowledge' ? 20 : 15) // 文本放在节点右侧
      .attr('text-anchor', 'start')
      .attr('fill', '#666')
      .attr('font-size', d => d.type === 'knowledge' ? '10px' : '9px')
      .text(d => `${(d.mastery * 100).toFixed(0)}%`);

    // 添加交互提示
    node.append('title')
      .text(d => `${d.id}\n掌握度: ${(d.mastery * 100).toFixed(1)}%`);

    // 添加知识点组标题
    const knowledgeLabels = svg.append('g')
      .attr('class', 'knowledge-labels')
      .selectAll('text')
      .data(nodes.filter(d => d.type === 'knowledge'))
      .enter()
      .append('text')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .attr('text-anchor', 'middle')
      .attr('dy', -30)
      .text(d => d.name || `知识点组 ${d.group + 1}`);

    // 添加图例
    const legend = svg.append('g')
      .attr('transform', `translate(${innerWidth}, 0)`);

    // 知识点类型图例
    const typeLegendData = [
      { color: nodeColorScale('knowledge'), text: '知识点' },
      { color: nodeColorScale('sub_knowledge'), text: '子知识点' }
    ];

    legend.append('text')
      .attr('y', -5)
      .text('类型:')
      .style('font-size', '12px');

    typeLegendData.forEach((item, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20 + 10})`);
      
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

    // 掌握度图例
    const masteryLegend = svg.append('g')
      .attr('transform', `translate(${innerWidth}, 70)`);

    masteryLegend.append('text')
      .attr('y', -5)
      .text('掌握程度:')
      .style('font-size', '12px');

    const masteryLegendData = [
      { opacity: opacityScale(0.1), text: '低 (0-30%)' },
      { opacity: opacityScale(0.5), text: '中 (30-40%)' },
      { opacity: opacityScale(0.9), text: '高 (40-100%)' }
    ];

    masteryLegendData.forEach((item, i) => {
      const legendRow = masteryLegend.append('g')
        .attr('transform', `translate(0, ${i * 20 + 10})`);
      
      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', nodeColorScale('knowledge'))
        .attr('fill-opacity', item.opacity);
      
      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .text(item.text)
        .style('font-size', '12px');
    });

    // 初始化节点位置，使其更均匀分布
    nodes.forEach(d => {
      if (d.type === 'knowledge') {
        // 根据组号计算初始位置
        const groupCount = knowledgePoints.length;
        const cols = Math.min(4, groupCount);
        const rows = Math.ceil(groupCount / cols);
        const colWidth = innerWidth / cols;
        const rowHeight = innerHeight / rows;
        
        const col = d.group % cols;
        const row = Math.floor(d.group / cols);
        
        // 设置初始位置在网格中心
        d.x = col * colWidth + colWidth / 2;
        d.y = row * rowHeight + rowHeight / 2;
      } else {
        // 子知识点围绕父节点分布
        const parentNode = nodes.find(n => n.id === d.parent);
        if (parentNode) {
          const angle = Math.random() * 2 * Math.PI;
          const distance = 30 + Math.random() * 20;
          d.x = parentNode.x + Math.cos(angle) * distance;
          d.y = parentNode.y + Math.sin(angle) * distance;
        }
      }
    });

    // 更新力导引图
    simulation.on('tick', () => {
      // 添加边界约束，确保节点不会超出可视区域
      nodes.forEach(d => {
        // 获取节点半径
        const radius = d.type === 'knowledge' ? 15 : 10;
        const textWidth = d.type === 'knowledge' ? 80 : 60; // 估计文本宽度
        
        // 限制x坐标在可视区域内，考虑文本宽度
        d.x = Math.max(radius, Math.min(innerWidth - radius - textWidth, d.x));
        
        // 限制y坐标在可视区域内
        d.y = Math.max(radius + 20, Math.min(innerHeight - radius - 20, d.y));
      });
      
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node.attr('transform', d => `translate(${d.x},${d.y})`);
      
      knowledgeLabels
        .attr('x', d => d.x)
        .attr('y', d => d.y - 20); // 调整标签位置，避免与节点重叠
    });

    // 拖拽事件处理函数
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      // 限制拖拽范围在可视区域内，考虑文本宽度
      const radius = d.type === 'knowledge' ? 15 : 10;
      const textWidth = d.type === 'knowledge' ? 80 : 60; // 估计文本宽度
      
      d.fx = Math.max(radius, Math.min(innerWidth - radius - textWidth, event.x));
      d.fy = Math.max(radius + 20, Math.min(innerHeight - radius - 20, event.y));
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      // 保持节点在拖动后的位置
      // d.fx = null;
      // d.fy = null;
    }

    // 添加说明文字
    svg.append('text')
      .attr('x', 10)
      .attr('y', innerHeight + 30)
      .attr('font-size', '12px')
      .attr('fill', '#666')
      .text('提示：可拖动节点调整位置，使用鼠标滚轮缩放图表');

    // 运行模拟以达到更稳定的布局
    for (let i = 0; i < 100; i++) {
      simulation.tick();
    }

    return () => {
      simulation.stop();
    };
  }, [data, width, height]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', overflow: 'auto', width: '100%', height: '100%' }}>
      <svg ref={svgRef} width={width} height={height} style={{ minWidth: '1200px', minHeight: '800px' }}></svg>
    </div>
  );
};

export default KnowledgeTreeGraph;