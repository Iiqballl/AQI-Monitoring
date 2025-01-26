document.getElementById('download-pdf').addEventListener('click', function() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text('Riwayat Data', 10, 10);
  doc.autoTable({ html: '#data-table' });
  doc.save('riwayat_data.pdf');
});

document.getElementById('download-excel').addEventListener('click', function() {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(document.getElementById('data-table'));
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Data');
  XLSX.writeFile(wb, 'riwayat_data.xlsx');
});

document.getElementById('filter-data').addEventListener('click', function() {
  const startDate = new Date(document.getElementById('start-date').value);
  const endDate = new Date(document.getElementById('end-date').value);
  const filteredData = sampleData.filter(item => item.timestamp >= startDate && item.timestamp <= endDate);
  renderTableData(filteredData, 0);
  renderPagination(Math.ceil(filteredData.length / 10), 1);
});

let deviceConnected = false;
let currentTime = new Date();
let intervalId = null;
let dataCleared = false; // Tambahkan variabel ini
let currentPage = 1; // Tambahkan variabel untuk menyimpan halaman saat ini
let currentSlide = 0; // Tambahkan variabel untuk menyimpan slide saat ini

// Function to fetch current time from an API
async function fetchCurrentTime() {
  try {
    const response = await fetch('http://worldtimeapi.org/api/timezone/Asia/Jakarta');
    const data = await response.json();
    return new Date(data.datetime);
  } catch (error) {
    console.error('Error fetching current time:', error);
    return new Date();
  }
}

async function fetchData() {
  const channelId = '2819146'; // Ganti dengan Channel ID Anda
  const readApiKey = 'MQIDSCJT83BEANGW'; // Ganti dengan Read API Key Anda
  const randomParam = Math.random(); // Tambahkan parameter acak untuk menghindari cache
  const url = `https://api.thingspeak.com/channels/${channelId}/feeds.json?api_key=${readApiKey}&results=1000&random=${randomParam}`; // Ambil hingga 1000 data

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log('Data fetched from ThingSpeak:', data); // Tambahkan logging

    if (data.feeds.length > 0) {
      deviceConnected = true;
      currentTime = await fetchCurrentTime(); // Perbarui currentTime dengan waktu terkini dari API
      startUpdatingTime(); // Mulai ulang interval pembaruan waktu
      return data.feeds.map(feed => ({
        timestamp: new Date(feed.created_at),
        suhu: `${parseFloat(feed.field1).toFixed(2)}°C`,
        kelembapan: `${parseFloat(feed.field2).toFixed(2)}%`,
        pm25: `${parseFloat(feed.field3).toFixed(2)} µg/m³`
      })).sort((a, b) => b.timestamp - a.timestamp); // Urutkan dari yang terbaru ke yang terlama
    } else {
      deviceConnected = false;
      stopUpdatingTime(); // Hentikan interval pembaruan waktu
      updateDisplayData(null); // Tampilkan data kosong
      renderTableData([], 0); // Hapus data di tabel
      return [];
    }
  } catch (error) {
    console.error('Error fetching data:', error);
    deviceConnected = false;
    stopUpdatingTime(); // Hentikan interval pembaruan waktu
    updateDisplayData(null); // Tampilkan data kosong
    renderTableData([], 0); // Hapus data di tabel
    return [];
  }
}

// Function to start updating time
function startUpdatingTime() {
  if (intervalId) {
    clearInterval(intervalId);
  }
  intervalId = setInterval(() => {
    if (deviceConnected) {
      currentTime = new Date(currentTime.getTime() + 1000);
      document.getElementById('timestamp-pemantauan').innerText = formatDateToWIB(currentTime);
    }
  }, 1000);
}

// Function to stop updating time
function stopUpdatingTime() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

// Function to render table data
function renderTableData(data, startIndex) {
  console.log('Rendering table data:', data); // Tambahkan logging
  const tableBody = document.querySelector('#data-table tbody');
  tableBody.innerHTML = '';
  if (data.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td colspan="5" class="text-center">No data available</td>
    `;
    tableBody.appendChild(row);
  } else {
    data.forEach((item, index) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${startIndex + index + 1}</td>
        <td>${formatDateToWIB(item.timestamp)}</td>
        <td>${item.suhu}</td>
        <td>${item.kelembapan}</td>
        <td>${item.pm25}</td>
      `;
      tableBody.appendChild(row);
    });
  }
}

// Function to render pagination
function renderPagination(totalPages, currentPage) {
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  const maxPagesToShow = 10;
  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage + 1 < maxPagesToShow) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageItem = document.createElement('li');
    pageItem.className = `page-item ${i === currentPage ? 'active' : ''}`;
    pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
    pageItem.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(i);
    });
    pagination.appendChild(pageItem);
  }

  if (startPage > 1) {
    const firstPageItem = document.createElement('li');
    firstPageItem.className = 'page-item';
    firstPageItem.innerHTML = `<a class="page-link" href="#">First</a>`;
    firstPageItem.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(1);
    });
    pagination.insertBefore(firstPageItem, pagination.firstChild);
  }

  if (endPage < totalPages) {
    const lastPageItem = document.createElement('li');
    lastPageItem.className = 'page-item';
    lastPageItem.innerHTML = `<a class="page-link" href="#">Last</a>`;
    lastPageItem.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(totalPages);
    });
    pagination.appendChild(lastPageItem);
  }

  // Add Previous button
  if (currentPage > 1) {
    const prevPageItem = document.createElement('li');
    prevPageItem.className = 'page-item';
    prevPageItem.innerHTML = `<a class="page-link" href="#">Previous</a>`;
    prevPageItem.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(currentPage - 1);
    });
    pagination.insertBefore(prevPageItem, pagination.firstChild);
  }

  // Add Next button
  if (currentPage < totalPages) {
    const nextPageItem = document.createElement('li');
    nextPageItem.className = 'page-item';
    nextPageItem.innerHTML = `<a class="page-link" href="#">Next</a>`;
    nextPageItem.addEventListener('click', (e) => {
      e.preventDefault();
      goToPage(currentPage + 1);
    });
    pagination.appendChild(nextPageItem);
  }
}

// Function to go to a specific page
function goToPage(page) {
  currentPage = page; // Simpan halaman saat ini
  const itemsPerPage = 10; // Tetap 10 item per halaman
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedData = sampleData.slice(startIndex, endIndex);

  renderTableData(paginatedData, startIndex);
  renderPagination(Math.ceil(sampleData.length / itemsPerPage), page);
}

// Function to search data by timestamp
function searchTable() {
  const searchInput = document.getElementById('search-timestamp').value.toLowerCase();
  const filteredData = sampleData.filter(item => formatDateToWIB(item.timestamp).toLowerCase().includes(searchInput));
  renderTableData(filteredData, 0);
  renderPagination(Math.ceil(filteredData.length / 10), 1);
}

// Event listener for search input
document.getElementById('search-timestamp').addEventListener('input', searchTable);

// Initial render
let sampleData = [];
async function updateData() {
  if (dataCleared) return; // Check if data has been cleared
  const data = await fetchData();
  sampleData = data;
  console.log('Updating data:', data); // Tambahkan logging
  goToPage(currentPage); // Kembali ke halaman yang disimpan
  updateChart(data);
  updateDisplayData(data[0]);
  // Kembalikan ke slide yang disimpan
  const slides = document.querySelectorAll('.carousel-item');
  slides.forEach((slide, index) => {
    if (index === currentSlide) {
      slide.classList.add('active');
    } else {
      slide.classList.remove('active');
    }
  });
}

// Chart.js setup
const ctx = document.getElementById('pm25Chart').getContext('2d');
const gradient = ctx.createLinearGradient(0, 0, 0, 400);
gradient.addColorStop(0, 'rgb(58, 145, 192)'); // Warna hijau kebiruan
gradient.addColorStop(1, 'rgba(75, 192, 192, 0)'); // Warna hijau kebiruan transparan

const pm25Chart = new Chart(ctx, {
  type: 'line',
  data: {
    labels: [], // Labels will be updated dynamically
    datasets: [{
      label: 'PM2.5 (µg/m³)',
      data: [], // Data will be updated dynamically
      borderColor: 'rgba(75, 192, 192, 1)',
      backgroundColor: gradient,
      borderWidth: 2,
      fill: true,
      tension: 0.4
    }]
  },
  options: {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `PM2.5: ${context.raw} µg/m³`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100, // Set maximum value for y-axis
        title: {
          display: true,
          text: 'PM2.5 (µg/m³)'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Timestamp'
        }
      }
    },
    animation: {
      duration: 2000,
      easing: 'easeInOutBounce'
    }
  }
});

// Update chart with data
function updateChart(data) {
  console.log('Updating chart with data:', data); // Tambahkan logging
  const recentData = data.slice(0, 20); // Ambil 20 data terakhir
  const labels = recentData.map(item => formatDateToWIB(item.timestamp));
  const pm25Data = recentData.map(item => parseFloat(item.pm25));

  pm25Chart.data.labels = labels;
  pm25Chart.data.datasets[0].data = pm25Data;
  pm25Chart.update();
}

// Update display data
function updateDisplayData(latestData) {
  console.log('Updating display data with:', latestData); // Tambahkan logging
  if (latestData) {
    document.getElementById('suhu').innerText = latestData.suhu;
    document.getElementById('kelembapan').innerText = latestData.kelembapan;
    document.getElementById('pm25').innerText = latestData.pm25;
    document.getElementById('timestamp-pemantauan').innerText = formatDateToWIB(currentTime);
    updateAirQualityCategory(parseFloat(latestData.pm25));
  } else {
    document.getElementById('suhu').innerText = '--';
    document.getElementById('kelembapan').innerText = '--';
    document.getElementById('pm25').innerText = '--';
    document.getElementById('timestamp-pemantauan').innerText = '--';
    updateAirQualityCategory(null);
  }
}

// Function to format date to WIB (UTC+07:00)
function formatDateToWIB(date) {
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }
  return new Intl.DateTimeFormat('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).format(date);
}

// Update air quality category
function updateAirQualityCategory(pm25Value) {
  let category = '';
  let categoryClass = '';
  let iconClass = '';
  let threshold = '';

  if (pm25Value === null) {
    category = '--';
    categoryClass = '';
    iconClass = '';
    threshold = '';
  } else if (pm25Value <= 15.4) {
    category = 'Baik';
    categoryClass = 'baik';
    iconClass = 'fas fa-smile';
    threshold = '0 - 15.4 µg/m³';
  } else if (pm25Value <= 55.4) {
    category = 'Sedang';
    categoryClass = 'sedang';
    iconClass = 'fas fa-meh';
    threshold = '15.5 - 55.4 µg/m³';
  } else if (pm25Value <= 150.4) {
    category = 'Tidak Sehat';
    categoryClass = 'tidak-sehat';
    iconClass = 'fas fa-frown';
    threshold = '55.5 - 150.4 µg/m³';
  } else if (pm25Value <= 250.4) {
    category = 'Sangat Tidak Sehat';
    categoryClass = 'sangat-tidak-sehat';
    iconClass = 'fas fa-dizzy';
    threshold = '150.5 - 250.4 µg/m³';
  } else {
    category = 'Berbahaya';
    categoryClass = 'berbahaya';
    iconClass = 'fas fa-skull-crossbones';
    threshold = '> 250.4 µg/m³';
  }
  const categoryElement = document.getElementById('kategori-kualitas-udara');
  categoryElement.innerHTML = `<i class="${iconClass}"></i> ${category} (${threshold})`;
  categoryElement.className = `air-quality-category ${categoryClass}`;
}

// Fetch data and update chart initially
updateData();

// Set interval to update data every 10 seconds (10000 milliseconds)
setInterval(updateData, 10000);

// Add event listener to resize chart on window resize
window.addEventListener('resize', () => {
  pm25Chart.resize();
});

// Event listener to save current slide index
document.querySelectorAll('.carousel-item').forEach((slide, index) => {
  slide.addEventListener('click', () => {
    currentSlide = index;
  });
});