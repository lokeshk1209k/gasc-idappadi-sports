const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../../student-client/src/pages/CompetitionsPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetNew = `  const fetchCompetitions = useCallback(async () => {
    try {
      const res = await fetch('/api/competitions', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setCompetitions(data.competitions || data.data || []);
      }
    } catch (err) {
      console.error('Failed to load competitions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCompetitions();
    if (token) {
      fetchMyRegistrations();
    }

    // Auto-sync every 2.5s so admin deletions/additions reflect instantly in real-time
    const interval = setInterval(() => {
      fetchCompetitions();
      if (token) fetchMyRegistrations();
    }, 2500);

    const handleFocus = () => {
      fetchCompetitions();
      if (token) fetchMyRegistrations();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [token, fetchCompetitions, fetchMyRegistrations]);`;

content = content.replace(/useEffect\(\(\)\s*=>\s*\{\s*const\s+initData[\s\S]*?initData\(\);\s*\},?\s*\[token,\s*fetchMyRegistrations\]\);/, targetNew);

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ CompetitionsPage.tsx updated with real-time auto-sync!');
