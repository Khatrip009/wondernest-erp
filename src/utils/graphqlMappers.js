// src/utils/graphqlMappers.js
export const mapInquiryStats = (data) => {
  if (!data) return { total: 0, statusCounts: {}, sourceDistribution: [], courseDistribution: [] };

  const total = data.inquiriesCollection?.aggregates?.totalCount || 0;

  // Status counts
  const statusCounts = {};
  (data.inquiriesGroupBy || []).forEach(item => {
    const status = item.keys?.[0] || 'Unknown';
    statusCounts[status] = item.aggregates?.totalCount || 0;
  });

  // Source distribution
  const sourceDistribution = (data.inquiry_sourcesCollection?.edges || []).map(edge => ({
    name: edge.node.name,
    count: edge.node.inquiriesCollection?.aggregates?.totalCount || 0,
  })).filter(s => s.count > 0);

  // Course distribution
  const courseDistribution = (data.coursesCollection?.edges || []).map(edge => ({
    name: edge.node.course_name,
    count: edge.node.inquiriesCollection?.aggregates?.totalCount || 0,
  })).filter(c => c.count > 0);

  return { total, statusCounts, sourceDistribution, courseDistribution };
};

export const mapUpcomingDemos = (data) => {
  if (!data) return [];
  return data.demo_sessionsCollection?.edges?.map(edge => edge.node) || [];
};

export const mapRecentDemos = (data) => {
  if (!data) return [];
  return data.demo_sessionsCollection?.edges?.map(edge => edge.node) || [];
};