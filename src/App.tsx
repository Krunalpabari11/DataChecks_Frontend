import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Calendar } from 'lucide-react';
import ApexCharts from 'react-apexcharts';

interface BookingData {
  arrival_date_year: number;
  arrival_date_month: string;
  arrival_date_day_of_month: number;
  adults: number;
  children: number;
  babies: number;
  country: string;
}

const getMonthNumber = (monthName: string): number => {
  const months: Record<string, number> = {
    January: 0, February: 1, March: 2, April: 3,
    May: 4, June: 5, July: 6, August: 7,
    September: 8, October: 9, November: 10, December: 11
  };
  return months[monthName] || 0;
};

const SparklineCard = ({ title, value, chartData, color = '#255aee' }) => {

  const series = [{
    data: chartData
  }];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="mb-4">
        <h2 className="text-sm text-gray-400">{title}</h2>
        <div className="text-2xl font-bold text-white">${value.toLocaleString()}</div>
      </div>
      <div className="h-16">
        <ApexCharts
          options={options}
          series={series}
          type="line"
          height="100%"
        />
      </div>
    </div>
  );
};

function App() {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [filteredData, setFilteredData] = useState<BookingData[]>([]);
  const [countryData, setCountryData] = useState<{ country: string; visitors: number }[]>([]);
  const [totalStats, setTotalStats] = useState({ adults: 0, children: 0, totalVisitors: 0 });
  const [timeSeriesData, setTimeSeriesData] = useState<{ date: string; visitors: number }[]>([]);

  useEffect(() => {
    Papa.parse('/hotel_bookings_1000.csv', {
      download: true,
      header: true,
      complete: (result) => {
        const parsedData: BookingData[] = result.data.map((row: any) => ({
          arrival_date_year: parseInt(row.arrival_date_year),
          arrival_date_month: row.arrival_date_month,
          arrival_date_day_of_month: parseInt(row.arrival_date_day_of_month),
          adults: parseInt(row.adults),
          children: parseInt(row.children),
          babies: parseInt(row.babies),
          country: row.country,
        }));
        setFilteredData(parsedData);
      },
    });
  }, []);

  useEffect(() => {
    const processData = () => {
      let filtered = [...filteredData];
      if (startDate && endDate) {
        filtered = filteredData.filter(entry => {
          const entryDate = new Date(
            entry.arrival_date_year,
            getMonthNumber(entry.arrival_date_month),
            entry.arrival_date_day_of_month
          );
          const start = new Date(startDate);
          const end = new Date(endDate);
          return entryDate >= start && entryDate <= end;
        });
      }

      const countryStats = filtered.reduce((acc, curr) => {
        const total = curr.adults + curr.children + curr.babies;
        acc[curr.country] = (acc[curr.country] || 0) + total;
        return acc;
      }, {} as Record<string, number>);

      const sortedCountries = Object.entries(countryStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([country, count]) => ({ country, visitors: count }));

      setCountryData(sortedCountries);

      const timeData = filtered.reduce((acc, curr) => {
        const date = new Date(
          curr.arrival_date_year,
          getMonthNumber(curr.arrival_date_month),
          curr.arrival_date_day_of_month
        );
        const dateStr = date.toISOString().split('T')[0];
        const visitors = curr.adults + curr.children + curr.babies;
        
        if (acc[dateStr]) {
          acc[dateStr] += visitors;
        } else {
          acc[dateStr] = visitors;
        }
        return acc;
      }, {} as Record<string, number>);

      const sortedTimeData = Object.entries(timeData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, visitors]) => ({ date, visitors }));

      setTimeSeriesData(sortedTimeData);

      const totals = filtered.reduce(
        (acc, curr) => ({
          adults: acc.adults + curr.adults,
          children: acc.children + curr.children,
          totalVisitors: acc.totalVisitors + curr.adults + curr.children + curr.babies
        }),
        { adults: 0, children: 0, totalVisitors: 0 }
      );

      setTotalStats(totals);
    };

    processData();
  }, [startDate, endDate, filteredData]);

  const handleQuickFilter = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-4xl font-bold text-white">Hotel Bookings Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-white border-none focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 bg-gray-800 p-2 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-white border-none focus:outline-none"
              />
            </div>
            <button
              onClick={() => handleQuickFilter(7)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleQuickFilter(30)}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Last 30 Days
            </button>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Visitors Over Time</h2>
            <ApexCharts
              options={{
                chart: {
                  type: 'area',
                  toolbar: {
                    show: true,
                    tools: {
                      download: false,
                      selection: true,
                      zoom: true,
                      zoomin: true,
                      zoomout: true,
                      pan: true,
                    }
                  },
                  zoom: { enabled: true },
                  foreColor: '#9CA3AF'
                },
                stroke: {
                  curve: 'smooth',
                  width: 2
                },
                fill: {
                  type: 'gradient',
                  gradient: {
                    shadeIntensity: 1,
                    opacityFrom: 0.7,
                    opacityTo: 0.2,
                    stops: [0, 90, 100]
                  }
                },
                dataLabels: { enabled: false },
                xaxis: {
                  type: 'datetime',
                  categories: timeSeriesData.map(d => d.date),
                  labels: {
                    datetimeFormatter: {
                      year: 'yyyy',
                      month: "MMM 'yy",
                      day: 'dd MMM',
                    }
                  }
                },
                yaxis: {
                  title: { text: 'Total Visitors' }
                },
                tooltip: {
                  x: { format: 'dd MMM yyyy' }
                }
              }}
              series={[{
                name: 'Visitors',
                data: timeSeriesData.map(d => d.visitors)
              }]}
              type="area"
              height={350}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Top 10 Countries</h2>
            <ApexCharts
              options={{
                chart: {
                  type: 'bar',
                  toolbar: { show: false },
                  foreColor: '#9CA3AF'
                },
                plotOptions: {
                  bar: {
                    borderRadius: 4,
                    horizontal: true,
                  }
                },
                dataLabels: { enabled: false },
                xaxis: {
                  categories: countryData.map(d => d.country)
                },
              }}
              series={[{
                name: 'Visitors',
                data: countryData.map(d => d.visitors)
              }]}
              type="bar"
              height={350}
            />
          </div>


        </div>
      </div>
    </div>
  );
}

export default App;