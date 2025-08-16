import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Calculator, Target, TrendingUp, Settings, ExternalLink } from 'lucide-react';

const App = () => {
  const [companyName, setCompanyName] = useState('Company');
  const [monthlyBudget, setMonthlyBudget] = useState(5000);
  const [primaryGoal, setPrimaryGoal] = useState('Generate Leads');
  const [constraints, setConstraints] = useState({
    google: 25,
    meta: 20,
    tiktok: 10,
    linkedin: 20
  });
  const [results, setResults] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState(null);

  // API configuration
  const API_BASE_URL = '/api'; // Replace with your actual API endpoint

  // Function to process explanation text with citations
  const processExplanationWithCitations = (explanation, citations) => {
    if (!explanation || !citations || citations.length === 0) {
      return <span>{explanation}</span>;
    }

    // Regular expression to match citation patterns like [1], [2,3], [1,2,3], etc.
    const citationRegex = /\[(\d+(?:,\s*\d+)*)\]/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(explanation)) !== null) {
      // Add text before the citation
      if (match.index > lastIndex) {
        parts.push(explanation.substring(lastIndex, match.index));
      }

      // Process the citation numbers
      const citationNumbers = match[1].split(',').map(num => parseInt(num.trim()) - 1); // Convert to 0-based index
      const validCitations = citationNumbers.filter(num => num >= 0 && num < citations.length);
      
      if (validCitations.length === 0) {
        parts.push(match[0]); // Return original if no valid citations found
      } else {
        // Create clickable citation links
        parts.push(
          <span key={`citation-${match.index}`} className="inline-flex items-center gap-1">
            <span className="text-blue-600 font-medium">[</span>
            {validCitations.map((citationIndex, i) => (
              <React.Fragment key={`${match.index}-${citationIndex}`}>
                <a
                  href={citations[citationIndex]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-0.5"
                  title={citations[citationIndex]}
                >
                  {citationIndex + 1}
                  <ExternalLink className="w-3 h-3" />
                </a>
                {i < validCitations.length - 1 && <span className="text-blue-600">,</span>}
              </React.Fragment>
            ))}
            <span className="text-blue-600 font-medium">]</span>
          </span>
        );
      }

      lastIndex = citationRegex.lastIndex;
    }

    // Add any remaining text after the last citation
    if (lastIndex < explanation.length) {
      parts.push(explanation.substring(lastIndex));
    }

    return <span>{parts}</span>;
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    setError(null);

    try {
      // Prepare the request payload
      const requestPayload = {
        company_name: companyName,
        monthly_budget: monthlyBudget,
        primary_goal: primaryGoal.toLowerCase().replace(' ', '_'),
        constraints: {
          google_min: constraints.google,
          meta_min: constraints.meta,
          tiktok_min: constraints.tiktok,
          linkedin_min: constraints.linkedin
        }
      };

      // Make the API call
      const response = await fetch(`${API_BASE_URL}/allocate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add any additional headers like authentication if needed
          // 'Authorization': `Bearer ${your_token}`,
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        throw new Error(`Can you try again ?`);
      }

      const apiResponse = await response.json();

      // Process the API response
      const adjustedAllocation = {
        google: apiResponse.allocation.google || 0,
        meta: apiResponse.allocation.meta || 0,
        linkedin: apiResponse.allocation.linkedin || 0,
        tiktok: apiResponse.allocation.tiktok || 0
      };

      // Calculate performance metrics based on API response or default CPA values
      const defaultCPAs = {
        google: 250,
        meta: 200,
        tiktok: 83,
        linkedin: 205
      };

      const performanceData = {};
      Object.entries(adjustedAllocation).forEach(([platform, budget]) => {
        const cpa = apiResponse.performance_metrics?.[platform]?.cpa || defaultCPAs[platform];
        const conversions = budget > 0 ? Math.round(budget / cpa) : 0;
        
        performanceData[platform] = {
          budget: budget,
          conversions: conversions,
          cpa: cpa
        };
      });

      setResults({
        allocation: adjustedAllocation,
        performance: performanceData,
        explanation: apiResponse.explanation || "Budget allocation optimized based on your goals and constraints.",
        confidence_intervals: apiResponse.confidence_intervals || null,
        citations: apiResponse.citations || [],
        additional_info: apiResponse.additional_info || []
      });

    } catch (err) {
      console.error('API call failed:', err);
      setError(err.message || 'Failed to calculate budget allocation. Please try again.');
      
      // Optional: Fall back to mock data in case of API failure
      // You can uncomment this section if you want fallback behavior
      /*
      const fallbackAllocation = {
        google: monthlyBudget * 0.25,
        meta: monthlyBudget * 0.45,
        linkedin: monthlyBudget * 0.20,
        tiktok: monthlyBudget * 0.10
      };

      const fallbackPerformance = {};
      Object.entries(fallbackAllocation).forEach(([platform, budget]) => {
        const defaultCPAs = { google: 250, meta: 200, tiktok: 83, linkedin: 205 };
        fallbackPerformance[platform] = {
          budget: budget,
          conversions: Math.round(budget / defaultCPAs[platform]),
          cpa: defaultCPAs[platform]
        };
      });

      setResults({
        allocation: fallbackAllocation,
        performance: fallbackPerformance,
        explanation: "Using fallback allocation due to API unavailability."
      });
      */
    } finally {
      setIsCalculating(false);
    }
  };

  const platformColors = {
    google: '#4285F4',
    meta: '#1877F2', 
    tiktok: '#FF0050',
    linkedin: '#0A66C2'
  };

  const platformNames = {
    google: 'Google Ads',
    meta: 'Meta Ads',
    tiktok: 'TikTok Ads',
    linkedin: 'LinkedIn Ads'
  };

  const pieData = results ? Object.entries(results.allocation).map(([platform, value]) => ({
    name: platformNames[platform],
    value: value,
    fill: platformColors[platform]
  })) : [];

  const barData = results ? Object.entries(results.performance).map(([platform, data]) => ({
    platform: platformNames[platform],
    conversions: data.conversions,
    fill: platformColors[platform]
  })) : [];

  const confidenceData = results && results.confidence_intervals ? Object.entries(results.allocation).map(([platform, recommended]) => {
    const intervals = results.confidence_intervals;
    const lower = intervals.P10?.[platform] || Math.round(recommended * 0.85);
    const upper = intervals.P90?.[platform] || Math.round(recommended * 1.15);
    
    return {
      platform: platformNames[platform],
      lower: Math.round(lower),
      recommended: Math.round(recommended),
      upper: Math.round(upper),
      confidence: '90% confidence'
    };
  }) : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Marketing Budget Allocation Tool</h1>
          <p className="text-gray-600">Optimize your ad spend across Google, Meta, TikTok, and LinkedIn</p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-800">
                <strong>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Campaign Details */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center mb-4">
              <Target className="w-5 h-5 text-blue-600 mr-2" />
              <h2 className="text-xl font-semibold text-gray-900">Campaign Details</h2>
            </div>
            <p className="text-gray-600 mb-6">Enter your company information and marketing goals</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Budget</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Primary Goal</label>
                <select
                  value={primaryGoal}
                  onChange={(e) => setPrimaryGoal(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option>Generate Leads</option>
                  <option>Increase Sales</option>
                  <option>Brand Awareness</option>
                  <option>Website Traffic</option>
                </select>
              </div>

              <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="w-full bg-gray-900 text-white py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isCalculating ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Calculating...
                  </div>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Calculate Budget Allocation
                  </>
                )}
              </button>
            </div>

            {/* Assumptions & Constraints */}
            <div className="mt-8">
              <div className="flex items-center mb-4">
                <Settings className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Assumptions & Constraints</h3>
              </div>
              <p className="text-gray-600 mb-4">Adjust minimum budget allocations for each platform</p>

              <div className="space-y-4">
                {Object.entries(constraints).map(([platform, value]) => (
                  <div key={platform}>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        {platformNames[platform]} Minimum: {value}%
                      </label>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={value}
                      onChange={(e) => setConstraints(prev => ({
                        ...prev,
                        [platform]: Number(e.target.value)
                      }))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, ${platformColors[platform]} 0%, ${platformColors[platform]} ${value * 2}%, #e5e7eb ${value * 2}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Middle Panel - Budget Allocation */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Budget Allocation for {companyName}</h2>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-gray-600 mb-6">Monthly budget: ${monthlyBudget.toLocaleString()} | Goal: {primaryGoal.toLowerCase()}</p>

            {results ? (
              <div className="space-y-6">
                <div className="flex justify-center">
                  <div className="w-64 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={120}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="space-y-3">
                  {Object.entries(results.allocation).map(([platform, value]) => (
                    <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        <div 
                          className="w-4 h-4 rounded-full mr-3"
                          style={{ backgroundColor: platformColors[platform] }}
                        ></div>
                        <span className="font-medium text-gray-900">{platformNames[platform]}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">${Math.round(value).toLocaleString()}</div>
                        <div className="text-sm text-gray-600">
                          {Math.round((value / monthlyBudget) * 100)}%
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <Calculator className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Click "Calculate Budget Allocation" to see results</p>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Projected Performance */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Projected Performance</h2>
            <p className="text-gray-600 mb-6">Estimated conversions and cost per acquisition by platform</p>

            {results ? (
              <div className="space-y-6">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="platform" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis />
                      <Bar dataKey="conversions" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(results.performance).map(([platform, data]) => (
                    <div key={platform} className="p-4 border rounded-lg">
                      <h4 className="font-semibold text-gray-900 mb-2">{platformNames[platform]}</h4>
                      <div className="space-y-1 text-sm">
                        <div>Budget: ${Math.round(data.budget).toLocaleString()}</div>
                        <div>Conversions: {data.conversions}</div>
                        <div>CPA: ${data.cpa}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                <div className="text-center">
                  <BarChart className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Performance metrics will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confidence Intervals */}
        {results && confidenceData.length > 0 && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Confidence Intervals</h2>
            <p className="text-gray-600 mb-6">Budget allocation ranges with confidence intervals</p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {confidenceData.map((data, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <h4 className="font-semibold text-gray-900 mb-3">{data.platform}</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Lower:</span>
                      <span>${data.lower.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-600">Recommended:</span>
                      <span>${data.recommended.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Upper:</span>
                      <span>${data.upper.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">{data.confidence}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommendation Explanation */}
        {results && (
          <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Recommendation Explanation</h2>
            <p className="text-gray-600 mb-4">Why this allocation makes sense for your goals</p>
            
            <div className="text-gray-800 leading-relaxed mb-6">
              {processExplanationWithCitations(results.explanation, results.citations)}
            </div>

            {/* Citations List */}
            {results.citations && results.citations.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">References:</h3>
                <div className="space-y-2">
                  {results.citations.map((url, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 font-medium min-w-0 shrink-0">[{index + 1}]</span>
                      <div className="flex-1 min-w-0">
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-words inline-flex items-center gap-1"
                        >
                          {url}
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Default Benchmarks:</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <div><strong>Google:</strong> WordStream Google Ads Benchmarks</div>
                <div><strong>LinkedIn:</strong> The B2B House LinkedIn Ad Benchmarks 2025</div>
                <div><strong>Meta:</strong> WordStream Facebook Ads Benchmarks 2024</div>
                <div><strong>TikTok:</strong> Lebesgue TikTok Ads Benchmarks</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;