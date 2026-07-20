import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { DollarSign, TrendingUp } from 'lucide-react';
import './App.css';

function App() {
  const [data, setData] = useState([]);
  const [departmentData, setDepartmentData] = useState([]);
  const [fundTypeData, setFundTypeData] = useState([]);
  const [yearData, setYearData] = useState([]);
  const [deptFundData, setDeptFundData] = useState([]);
  const [fundTypesList, setFundTypesList] = useState([]);
  const [totalBudget, setTotalBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedDepartment, setSelectedDepartment] = useState(null);

  const COLORS = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#06b6d4', '#eab308', '#6366f1', '#14b8a6',
    '#f97316', '#a855f7', '#0ea5e9', '#84cc16', '#d946ef'
  ];

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 35;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#1f2937"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="9"
        fontWeight="500"
      >
        {`${name}: ${formatCurrency(value)}`}
      </text>
    );
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/budget_capital_fy_datasd.csv');
        const csv = await response.text();
        
        Papa.parse(csv, {
          header: true,
          skipEmptyLines: true,
          dynamicTyping: false,
          complete: (results) => {
            const parsedData = results.data;
            setData(parsedData);
            processData(parsedData);
          },
        });
      } catch (error) {
        console.error('Error loading CSV:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processData = (rawData) => {
    // Aggregate by department
    const deptMap = {};
    let total = 0;

    // Aggregate by fund type
    const fundMap = {};

    // Aggregate by fiscal year
    const yearMap = {};

    // Aggregate by department and fund type
    const deptFundMap = {};
    
    // Track all unique fund types
    const allFundTypes = new Set();

    rawData.forEach((row) => {
      const amount = parseInt(row.amount) || 0;
      const dept = row.asset_owning_dept || 'Unknown';
      const fund = row.fund_type || 'Unknown';
      const fy = row.report_fy || '0';

      total += amount;
      allFundTypes.add(fund);

      deptMap[dept] = (deptMap[dept] || 0) + amount;
      fundMap[fund] = (fundMap[fund] || 0) + amount;
      
      // For fiscal year line chart
      const fyLabel = `FY20${fy}`;
      yearMap[fyLabel] = (yearMap[fyLabel] || 0) + amount;

      // For stacked bar chart (dept + fund type)
      if (!deptFundMap[dept]) {
        deptFundMap[dept] = {};
      }
      deptFundMap[dept][fund] = (deptFundMap[dept][fund] || 0) + amount;
    });

    setTotalBudget(total);

    // Convert to array format for charts and sort by amount
    const deptArray = Object.entries(deptMap)
      .map(([name, value]) => ({
        name,
        value,
        amount: value.toLocaleString(),
      }))
      .sort((a, b) => b.value - a.value);

    const fundArray = Object.entries(fundMap)
      .map(([name, value]) => ({
        name,
        value,
        amount: value.toLocaleString(),
      }))
      .sort((a, b) => b.value - a.value);

    // Fiscal year data - sorted by year
    const yearArray = Object.entries(yearMap)
      .map(([year, value]) => ({
        year,
        value,
        amount: value.toLocaleString(),
      }))
      .sort((a, b) => a.year.localeCompare(b.year));

    // Stacked bar data - departments with fund type breakdown
    const stackedArray = Object.entries(deptFundMap)
      .map(([dept, fundBreakdown]) => {
        const deptData = { name: dept };
        // Add all fund types for this department
        allFundTypes.forEach(fund => {
          deptData[fund] = fundBreakdown[fund] || 0;
        });
        return deptData;
      })
      .sort((a, b) => {
        const totalA = Object.values(a).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
        const totalB = Object.values(b).reduce((sum, val) => typeof val === 'number' ? sum + val : sum, 0);
        return totalB - totalA;
      })
      .slice(0, 10); // Top 10 departments

    // Sort fund types by total spending for consistent coloring
    const sortedFundTypes = Array.from(allFundTypes)
      .map(fund => ({ name: fund, amount: fundMap[fund] || 0 }))
      .sort((a, b) => b.amount - a.amount)
      .map(f => f.name)
      .slice(0, 10); // Top 10 fund types

    setDepartmentData(deptArray);
    setFundTypeData(fundArray);
    setYearData(yearArray);
    setDeptFundData(stackedArray);
    setFundTypesList(sortedFundTypes);
  };

  const formatCurrency = (value) => {
    return `$${(value / 1000000).toFixed(1)}M`;
  };

  if (loading) {
    return (
      <div className="loading">
        <p>Loading budget data...</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <TrendingUp size={32} />
            <h1>San Diego Capital Improvement Plan Budget Dashboard</h1>
          </div>
          <p className="subtitle">FY Budget Analysis - Capital Spending by Department and Fund Type</p>
        </div>
      </header>

      <div className="metrics">
        <div className="metric-card">
          <div className="metric-icon">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <p className="metric-label">Total Budget</p>
            <p className="metric-value">{formatCurrency(totalBudget)}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <TrendingUp size={24} />
          </div>
          <div className="metric-content">
            <p className="metric-label">Departments</p>
            <p className="metric-value">{departmentData.length}</p>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <DollarSign size={24} />
          </div>
          <div className="metric-content">
            <p className="metric-label">Fund Types</p>
            <p className="metric-value">{fundTypeData.length}</p>
          </div>
        </div>
      </div>

      <div className="charts-container">
        <div className="chart-section">
          <h2>Capital Spending by Department</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={departmentData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h2>Capital Spending by Fund Type</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={fundTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h2>Fund Type Distribution (Top 10)</h2>
          <ResponsiveContainer width="100%" height={700}>
            <PieChart>
              <Pie
                data={fundTypeData.slice(0, 10)}
                cx="35%"
                cy="50%"
                labelLine={{ stroke: '#000', strokeWidth: 1, position: 'outside' }}
                label={<CustomLabel />}
                outerRadius={150}
                fill="#8884d8"
                dataKey="value"
              >
                {fundTypeData.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h2>Department Distribution (Top 10)</h2>
          <ResponsiveContainer width="100%" height={700}>
            <PieChart>
              <Pie
                data={departmentData.slice(0, 10)}
                cx="35%"
                cy="50%"
                labelLine={{ stroke: '#000', strokeWidth: 1, position: 'outside' }}
                label={<CustomLabel />}
                outerRadius={230}
                fill="#8884d8"
                dataKey="value"
              >
                {departmentData.slice(0, 10).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h2>Total Capital Budget Trend by Fiscal Year</h2>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={yearData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="year" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#667eea" 
                strokeWidth={2}
                dot={{ fill: '#667eea', r: 4 }}
                activeDot={{ r: 6 }}
                name="Annual Budget"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-section">
          <h2>Funding Mix by Department (Top 10)</h2>
          <ResponsiveContainer width="100%" height={700}>
            <BarChart data={deptFundData} margin={{ top: 20, right: 30, left: 20, bottom: 100 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45} 
                textAnchor="end" 
                height={120}
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={formatCurrency} tickCount={12} />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelStyle={{ color: '#000' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              {/* Render bars for each fund type */}
              {fundTypesList.map((fundType, index) => (
                <Bar
                  key={fundType}
                  dataKey={fundType}
                  stackId="a"
                  fill={COLORS[index % COLORS.length]}
                  name={fundType}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="data-tables">
        <div className="table-section">
          <h2>All Departments</h2>
          <table>
            <thead>
              <tr>
                <th>Department</th>
                <th>Amount</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {departmentData.map((dept) => (
                <tr key={dept.name}>
                  <td>{dept.name}</td>
                  <td>${dept.amount}</td>
                  <td>{((dept.value / totalBudget) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="table-section">
          <h2>All Fund Types</h2>
          <table>
            <thead>
              <tr>
                <th>Fund Type</th>
                <th>Amount</th>
                <th>% of Total</th>
              </tr>
            </thead>
            <tbody>
              {fundTypeData.map((fund) => (
                <tr key={fund.name}>
                  <td>{fund.name}</td>
                  <td>${fund.amount}</td>
                  <td>{((fund.value / totalBudget) * 100).toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="footer">
        <p>Data source: San Diego Open Data Portal - CIP Budget</p>
      </footer>
    </div>
  );
}

export default App;
