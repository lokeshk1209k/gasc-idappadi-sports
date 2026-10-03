/**
 * Chart.js Visualizations for Admin Analytics
 */

let deptChartInstance = null;
let equipmentChartInstance = null;
let sportsChartInstance = null;

async function initAdminCharts() {
  try {
    const res = await apiRequest('/analytics/charts');
    const { departmentChart, equipmentChart, sportsChart } = res;

    // 1. Players by Department (Doughnut)
    const deptCanvas = document.getElementById('chart-players-department');
    if (deptCanvas) {
      if (deptChartInstance) deptChartInstance.destroy();
      deptChartInstance = new Chart(deptCanvas, {
        type: 'doughnut',
        data: {
          labels: departmentChart.labels || [],
          datasets: [{
            data: departmentChart.data || [],
            backgroundColor: [
              '#0f4c81',
              '#05c46b',
              '#f39c12',
              '#9b59b6',
              '#e74c3c',
              '#1abc9c',
              '#34495e',
              '#d35400'
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Poppins', size: 11 } } }
          }
        }
      });
    }

    // 2. Equipment Inventory Status (Bar)
    const eqCanvas = document.getElementById('chart-equipment-status');
    if (eqCanvas) {
      if (equipmentChartInstance) equipmentChartInstance.destroy();
      equipmentChartInstance = new Chart(eqCanvas, {
        type: 'bar',
        data: {
          labels: ['Available', 'Issued to Players', 'Damaged', 'Lost / Missing'],
          datasets: [{
            label: 'Equipment Units',
            data: [
              equipmentChart.available || 0,
              equipmentChart.issued || 0,
              equipmentChart.damaged || 0,
              equipmentChart.lost || 0
            ],
            backgroundColor: [
              'rgba(5, 196, 107, 0.85)',
              'rgba(15, 76, 129, 0.85)',
              'rgba(243, 156, 18, 0.85)',
              'rgba(231, 76, 60, 0.85)'
            ],
            borderRadius: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
            x: { grid: { display: false } }
          }
        }
      });
    }

    // 3. Players by Sport Discipline (Horizontal Bar)
    const sportsCanvas = document.getElementById('chart-sports-distribution');
    if (sportsCanvas) {
      if (sportsChartInstance) sportsChartInstance.destroy();
      sportsChartInstance = new Chart(sportsCanvas, {
        type: 'bar',
        data: {
          labels: sportsChart.labels || [],
          datasets: [{
            label: 'Registered Athletes',
            data: sportsChart.data || [],
            backgroundColor: 'rgba(15, 76, 129, 0.8)',
            borderRadius: 6
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { beginAtZero: true, ticks: { precision: 0 } },
            y: { grid: { display: false } }
          }
        }
      });
    }
  } catch (err) {
    console.error('Error loading charts:', err);
  }
}
