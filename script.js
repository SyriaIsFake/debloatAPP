// script.js
const metrics = [
  'water','sodium','carbs','fasting','sauna',
  'cardio','sleep','alcohol','caffeine',
  'greentea','dandelion','potassium','magnesium'
];
const units = {
  water:'ml', sodium:'g', carbs:'g', fasting:'h', sauna:'',
  cardio:'min', sleep:'h', alcohol:'units', caffeine:'mg',
  greentea:'cups', dandelion:'mg', potassium:'mg', magnesium:'mg'
};
const categories = {
  hydration:    ['water','caffeine','greentea'],
  nutrition:    ['sodium','carbs','potassium','magnesium'],
  activity:     ['fasting','sauna','cardio','sleep'],
  supplement:   ['alcohol','dandelion']
};

let data = {}, goals = {}, chartInstances = {};

document.addEventListener('DOMContentLoaded', () => {
  data  = JSON.parse(localStorage.getItem('metricsData') || '{}');
  goals = JSON.parse(localStorage.getItem('goalsData')   || '{}');

  // Populate goal inputs
  metrics.forEach(id => {
    const gi = document.getElementById('goal-'+id);
    if (gi) gi.value = goals[id] || '';
  });

  // Initialize sliders & live-update display
  metrics.forEach(id => {
    const el = document.getElementById(id), span = document.getElementById(id+'-value');
    if (el && span) {
      const min = parseFloat(el.min) || 0;
      el.value = min; span.textContent = min;
      el.addEventListener('input', () => span.textContent = el.value);
    }
  });

  // Plus/minus number-inputs
  document.querySelectorAll('.number-input .plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const step = parseFloat(input.step)||1, max = parseFloat(input.max)||Infinity;
      input.value = Math.min(max, parseFloat(input.value)+step);
      input.dispatchEvent(new Event('input'));
    });
  });
  document.querySelectorAll('.number-input .minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.dataset.target);
      const step = parseFloat(input.step)||1, min = parseFloat(input.min)||0;
      input.value = Math.max(min, parseFloat(input.value)-step);
      input.dispatchEvent(new Event('input'));
    });
  });

  // Manual panel initial values
  metrics.forEach(id => {
    const mi = document.getElementById('adjust-'+id);
    if (mi) mi.value = data[id] || 0;
  });

  // Dark mode toggle
  const dm = document.getElementById('dark-mode-toggle');
  const darkPref = localStorage.getItem('darkMode') === 'true';
  dm.checked = darkPref;
  document.body.classList.toggle('dark', darkPref);
  dm.addEventListener('change', () => {
    const on = dm.checked;
    document.body.classList.toggle('dark', on);
    localStorage.setItem('darkMode', on);
    renderAllCharts();
  });

  // Collapse buttons
  document.querySelectorAll('.collapse-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const can = document.getElementById(btn.dataset.target);
      if (can.style.display === 'none') {
        can.style.display = 'block'; btn.textContent = '▲';
      } else {
        can.style.display = 'none'; btn.textContent = '▼';
      }
    });
  });

  // Toggle metrics
  metrics.forEach(id => {
    const cb = document.getElementById('toggle-'+id);
    if (cb) cb.addEventListener('change', renderAllCharts);
  });

  // Flash effect
  function flashButton(id) {
    const btn = document.getElementById(id);
    btn.classList.add('glow');
    setTimeout(()=>btn.classList.remove('glow'), 800);
  }

  // Save goals
  document.getElementById('save-goals-btn').addEventListener('click', () => {
    metrics.forEach(id => {
      const v = parseFloat(document.getElementById('goal-'+id).value);
      goals[id] = isNaN(v) ? 0 : v;
    });
    localStorage.setItem('goalsData', JSON.stringify(goals));
    flashButton('save-goals-btn');
    renderAllCharts();
  });

  // Reset goals
  document.getElementById('reset-goals-btn').addEventListener('click', () => {
    metrics.forEach(id => {
      document.getElementById('goal-'+id).value = '';
      goals[id] = 0;
    });
    localStorage.setItem('goalsData', JSON.stringify(goals));
    flashButton('reset-goals-btn');
    renderAllCharts();
  });

  // Add progress
  document.getElementById('save-btn').addEventListener('click', () => {
    metrics.forEach(id => {
      const el = document.getElementById(id);
      const val = parseFloat(el.value) || 0;
      data[id] = (data[id]||0) + val;
      el.value = el.min;
      document.getElementById(id+'-value').textContent = el.min;
      document.getElementById('adjust-'+id).value = data[id];
    });
    localStorage.setItem('metricsData', JSON.stringify(data));
    flashButton('save-btn');
    renderAllCharts();
  });

  // Manual update
  document.getElementById('manual-form').addEventListener('submit', e => {
    e.preventDefault();
    metrics.forEach(id => {
      data[id] = parseFloat(document.getElementById('adjust-'+id).value) || 0;
    });
    localStorage.setItem('metricsData', JSON.stringify(data));
    flashButton('manual-update-btn');
    renderAllCharts();
  });

  // Reset manual
  document.getElementById('reset-manual-btn').addEventListener('click', () => {
    metrics.forEach(id => {
      document.getElementById('adjust-'+id).value = 0;
    });
    flashButton('reset-manual-btn');
  });

  // Initial render
  renderAllCharts();
});

function renderAllCharts() {
  for (const [cat,list] of Object.entries(categories)) {
    renderCategoryChart(cat,list);
  }
}

function renderCategoryChart(cat,list) {
  const canvas = document.getElementById('chart-'+cat),
        ctx    = canvas.getContext('2d'),
        active = list.filter(m=>document.getElementById('toggle-'+m).checked),
        labels = active.map(m=>`${m.charAt(0).toUpperCase()+m.slice(1)} (${units[m]})`),
        actuals= active.map(m=>data[m]||0),
        goalsArr=active.map(m=>goals[m]||0),
        style  = getComputedStyle(document.body),
        a1     = style.getPropertyValue('--accent1').trim(),
        a2     = style.getPropertyValue('--accent2').trim(),
        txt    = style.getPropertyValue('--text').trim(),
        sub    = style.getPropertyValue('--sub').trim(),
        grad   = ctx.createLinearGradient(0,0,0,canvas.clientHeight);
  grad.addColorStop(0,a2); grad.addColorStop(1,a1);
  if(chartInstances[cat]) chartInstances[cat].destroy();
  chartInstances[cat] = new Chart(ctx,{
    data:{labels,datasets:[
      {label:'Actual', data:actuals, type:'bar', backgroundColor:grad, borderRadius:6, barPercentage:0.6},
      {label:'Goal',   data:goalsArr, type:'bar', backgroundColor:a2+'33', borderColor:a2, borderWidth:2, borderRadius:6, barPercentage:0.4}
    ]},
    options:{
      responsive:true, maintainAspectRatio:false,
      plugins:{
        legend:{position:'bottom',labels:{color:txt}},
        tooltip:{
          backgroundColor:style.getPropertyValue('--panel').trim(),
          titleColor:txt, bodyColor:txt, borderColor:sub, borderWidth:1
        }
      },
      scales:{
        x:{ticks:{color:txt},grid:{display:false}},
        y:{beginAtZero:true,ticks:{color:txt},grid:{color:sub}}
      }
    }
  });
}
