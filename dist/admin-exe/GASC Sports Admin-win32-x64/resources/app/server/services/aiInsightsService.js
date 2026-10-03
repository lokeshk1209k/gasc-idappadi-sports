const { supabase, toCamelCase } = require('../utils/supabaseHelper');

class AIInsightsService {
  static async generateInsights() {
    try {
      const insights = [];

      // 1. Department Participation Analysis
      const { data: studentsRaw } = await supabase
        .from('users')
        .select('department')
        .eq('role', 'student');

      const totalStudents = studentsRaw ? studentsRaw.length : 0;
      if (studentsRaw && studentsRaw.length > 0) {
        const deptCounts = {};
        studentsRaw.forEach(s => {
          const dept = s.department || 'General';
          deptCounts[dept] = (deptCounts[dept] || 0) + 1;
        });

        const sortedDepts = Object.entries(deptCounts).sort((a, b) => b[1] - a[1]);
        if (sortedDepts.length > 0) {
          const [topDept, count] = sortedDepts[0];
          const pct = Math.round((count / totalStudents) * 100);
          insights.push({
            type: 'participation',
            icon: 'bi-mortarboard',
            badge: 'High Engagement',
            color: 'primary',
            title: `Leading Department: ${topDept}`,
            message: `${topDept} leads student sports registration with ${count} athletes (${pct}% of all registered players at GASC Idappadi).`
          });
        }
      }

      // 2. Equipment Inventory Analysis
      const { data: eqList } = await supabase
        .from('equipment')
        .select('name, available_quantity, minimum_stock');

      const lowStockItems = (eqList || []).filter(i => (i.available_quantity || 0) <= (i.minimum_stock || 5));

      if (lowStockItems.length > 0) {
        const itemNames = lowStockItems.map(i => `${i.name} (${i.available_quantity} left)`).slice(0, 3).join(', ');
        insights.push({
          type: 'inventory',
          icon: 'bi-exclamation-triangle-fill',
          badge: 'Action Required',
          color: 'danger',
          title: `Critical Equipment Alert (${lowStockItems.length} items low)`,
          message: `Stock level for ${itemNames} has reached or fallen below minimum thresholds. Immediate procurement is recommended before upcoming zonal trials.`
        });
      } else {
        insights.push({
          type: 'inventory',
          icon: 'bi-check-circle-fill',
          badge: 'Optimal',
          color: 'success',
          title: 'Equipment Reserve Healthy',
          message: 'All sports equipment stocks are currently above minimum threshold reserves. Ready for intra-mural tournaments.'
        });
      }

      // 3. College Team Formations Analysis
      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      if (totalTeams && totalTeams > 0) {
        insights.push({
          type: 'teams',
          icon: 'bi-shield-shaded',
          badge: `${totalTeams} Teams Formed`,
          color: 'info',
          title: `Active College Teams: ${totalTeams}`,
          message: `Department sports teams have been formed with assigned team captains across sports disciplines for upcoming inter-college events.`
        });
      }

      // 4. Competitions & Medals Momentum
      const { data: achievements } = await supabase
        .from('achievements')
        .select('medal');

      const totalAchievements = achievements ? achievements.length : 0;
      const goldMedals = (achievements || []).filter(a => a.medal === 'Gold').length;

      if (totalAchievements > 0) {
        insights.push({
          type: 'achievement',
          icon: 'bi-trophy-fill',
          badge: `${goldMedals} Gold Medals`,
          color: 'warning',
          title: 'Championship Winning Streak',
          message: `GASC Idappadi players have secured ${totalAchievements} major collegiate awards this season, including ${goldMedals} Gold Medals across Athletics, Kabaddi, and Volleyball.`
        });
      }

      // 5. Strategic Recommendation
      const { data: upcomingComps } = await supabase
        .from('competitions')
        .select('id')
        .in('status', ['Upcoming', 'Registration Open']);

      const upcomingCount = upcomingComps ? upcomingComps.length : 0;
      insights.push({
        type: 'recommendation',
        icon: 'bi-lightbulb-fill',
        badge: 'Sports Incharge Focus',
        color: 'info',
        title: 'Sports Incharge Strategic Focus',
        message: upcomingCount > 0
          ? `There are ${upcomingCount} upcoming competition(s) with open registrations. Verify team selections and coordinate with the physical director for specialized coaching sessions.`
          : 'Plan an Inter-Departmental Sports Meet or friendly matches with neighbouring colleges to maintain player match fitness.'
      });

      return insights;
    } catch (error) {
      console.error('Error generating AI insights:', error.message);
      return [];
    }
  }
}

module.exports = AIInsightsService;
