"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import AdminNavbar from "@/components/Navbar"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from "recharts"

interface User {
  id: number | string
  createdAt: string
  full_name: string
  phone_number: string
  tg_user: string
}

export default function Statistics() {
  const [users, setUsers] = useState<User[]>([])
  const [hourlyStats, setHourlyStats] = useState<{ hour: string; count: number }[]>([])
  const [dailyStats, setDailyStats] = useState<{ date: string; count: number }[]>([])
  const [weeklyStats, setWeeklyStats] = useState<{ week: string; count: number }[]>([])
  const [monthlyStats, setMonthlyStats] = useState<{ month: string; count: number }[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const router = useRouter()

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  // Check authentication
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("isAuthenticated") !== "true") {
      router.push("/login")
    }
  }, [])

  // Fetch users
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const res = await axios.get<User[]>(`${process.env.NEXT_PUBLIC_API_URL}/users`)
        setUsers(res.data)
      } catch (err) {
        console.error("Foydalanuvchilarni yuklashda xatolik:", err)
        setError("Foydalanuvchilarni yuklashda xatolik yuz berdi")
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  // Calculate statistics
  useEffect(() => {
    if (users.length > 0) {
      calculateStats()
    }
  }, [users])

  const calculateStats = () => {
    // Hourly stats (for daily diagram)
    const hourly: Record<string, number> = {}
    // Daily stats (for weekly diagram)
    const daily: Record<string, number> = {}
    // Weekly stats (for monthly diagram)
    const weekly: Record<string, number> = {}
    // Monthly stats
    const monthly: Record<string, number> = {}

    users.forEach((user) => {
      const dateObj = new Date(user.createdAt)
      if (isNaN(dateObj.getTime())) return

      // Hourly stats: HH format
      const hour = dateObj.getHours().toString().padStart(2, "0")
      const hourKey = `${hour}:00`
      hourly[hourKey] = (hourly[hourKey] || 0) + 1

      // Daily stats: DD format (day of month)
      const day = dateObj.getDate().toString().padStart(2, "0")
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0")
      const dayKey = `${day}.${month}`
      daily[dayKey] = (daily[dayKey] || 0) + 1

      // Weekly stats: Week number
      const oneJan = new Date(dateObj.getFullYear(), 0, 1)
      const daysPassed = Math.floor((dateObj.getTime() - oneJan.getTime()) / 86400000)
      const weekNumber = Math.ceil((daysPassed + oneJan.getDay() + 1) / 7)
      const weekKey = `${weekNumber}-hafta`
      weekly[weekKey] = (weekly[weekKey] || 0) + 1

      // Monthly stats: Month name
      const monthNames = [
        "Yanvar",
        "Fevral",
        "Mart",
        "Aprel",
        "May",
        "Iyun",
        "Iyul",
        "Avgust",
        "Sentabr",
        "Oktabr",
        "Noyabr",
        "Dekabr",
      ]
      const monthKey = monthNames[dateObj.getMonth()]
      monthly[monthKey] = (monthly[monthKey] || 0) + 1
    })

    // Convert to arrays and sort
    const hourlyArr = Object.keys(hourly)
      .map((key) => ({ hour: key, count: hourly[key] }))
      .sort((a, b) => {
        return Number.parseInt(a.hour) - Number.parseInt(b.hour)
      })

    const dailyArr = Object.keys(daily)
      .map((key) => ({ date: key, count: daily[key] }))
      .sort((a, b) => {
        const [aDay, aMonth] = a.date.split(".")
        const [bDay, bMonth] = b.date.split(".")
        return aMonth === bMonth
          ? Number.parseInt(aDay) - Number.parseInt(bDay)
          : Number.parseInt(aMonth) - Number.parseInt(bMonth)
      })

    const weeklyArr = Object.keys(weekly)
      .map((key) => ({ week: key, count: weekly[key] }))
      .sort((a, b) => {
        return Number.parseInt(a.week) - Number.parseInt(b.week)
      })

    const monthlyArr = Object.keys(monthly).map((key) => ({ month: key, count: monthly[key] }))

    setHourlyStats(hourlyArr)
    setDailyStats(dailyArr)
    setWeeklyStats(weeklyArr)
    setMonthlyStats(monthlyArr)
  }

  // Calculate total users by platform (for pie chart)
  const calculatePlatformStats = () => {
    const platforms: Record<string, number> = {
      Android: 0,
      iOS: 0,
      Desktop: 0,
      Other: 0,
    }

    // This is just a placeholder - in a real app, you'd have platform data
    // Here we're just generating random data for demonstration
    users.forEach(() => {
      const rand = Math.random()
      if (rand < 0.4) platforms["Android"]++
      else if (rand < 0.7) platforms["iOS"]++
      else if (rand < 0.9) platforms["Desktop"]++
      else platforms["Other"]++
    })

    return Object.keys(platforms).map((key) => ({
      name: key,
      value: platforms[key],
    }))
  }

  const platformData = calculatePlatformStats()

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-lg rounded-md">
          <p className="font-medium text-gray-700">{`${label}`}</p>
          <p className="text-indigo-600 font-bold">{`${payload[0].value} foydalanuvchi`}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-700 px-6 py-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <span className="bg-white text-indigo-700 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </span>
                  Statistika
                </h1>
                <p className="mt-2 text-indigo-200">Iman Akhmedovna vebinar statistikasi</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 flex items-center gap-3">
                  <div className="bg-indigo-600 p-3 rounded-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-100">Jami foydalanuvchilar</p>
                    <p className="text-2xl font-bold">{users.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-indigo-500 animate-spin"></div>
                <div
                  className="absolute top-0 left-0 h-24 w-24 rounded-full border-t-4 border-b-4 border-pink-500 animate-spin"
                  style={{ animationDirection: "reverse", opacity: 0.7 }}
                ></div>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-red-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Daily registrations by hour */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-indigo-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Soatlar bo'yicha ro'yxatdan o'tishlar
                  </h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={hourlyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="hour" stroke="#6366f1" />
                        <YAxis stroke="#6366f1" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar dataKey="count" name="Foydalanuvchilar soni" fill="#8884d8" radius={[4, 4, 0, 0]}>
                          {hourlyStats.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Weekly registrations by day */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-pink-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Kunlar bo'yicha ro'yxatdan o'tishlar
                  </h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="date" stroke="#ec4899" />
                        <YAxis stroke="#ec4899" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Foydalanuvchilar soni"
                          stroke="#ec4899"
                          strokeWidth={3}
                          dot={{ r: 6 }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly registrations by week */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    Haftalar bo'yicha ro'yxatdan o'tishlar
                  </h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={weeklyStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="week" stroke="#10b981" />
                        <YAxis stroke="#10b981" />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="count"
                          name="Foydalanuvchilar soni"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Platform distribution */}
                <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100">
                  <h2 className="text-xl font-bold mb-4 text-gray-800 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                    Platformalar bo'yicha taqsimot
                  </h2>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={platformData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {platformData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

