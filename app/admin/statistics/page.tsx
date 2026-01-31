"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { useRouter } from "next/navigation"
import AdminNavbar from "@/components/Navbar"

interface User {
  id: number | string
  createdAt: string
  full_name: string
  phone_number: string
  tg_user: string
}

interface DailyRegistration {
  date: string
  count: number
  fullDate: string
}

export default function Statistics() {
  const [users, setUsers] = useState<User[]>([])
  const [dailyRegistrations, setDailyRegistrations] = useState<DailyRegistration[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string>("")
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("isAuthenticated") !== "true") {
      router.push("/")
    }
  }, [router])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        setError("")

        const controller = new AbortController()
    
        const res = await axios.get<User[]>(`https://b.kardioclinic.uz/userscha`, {
          signal: controller.signal,
          timeout: 5000,
        })

        setUsers(res.data)
        calculateDailyRegistrations(res.data)
      } catch (err: any) {
        console.error("Foydalanuvchilarni yuklashda xatolik:", err)
        if (err.name === "AbortError") {
          setError("So'rov vaqti tugadi. Iltimos, qayta urinib ko'ring.")
        } else {
          setError("Statistika ma'lumotlarini yuklashda xatolik yuz berdi")
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const calculateDailyRegistrations = (userData: User[]) => {
    const daily: Record<string, { count: number; fullDate: string }> = {}

    userData.forEach((user) => {
      const dateObj = new Date(user.createdAt)
      if (isNaN(dateObj.getTime())) return

      const day = dateObj.getDate().toString().padStart(2, "0")
      const month = (dateObj.getMonth() + 1).toString().padStart(2, "0")
      const year = dateObj.getFullYear()
      const dayKey = `${day}.${month}.${year}`

      if (!daily[dayKey]) {
        daily[dayKey] = { count: 0, fullDate: dayKey }
      }
      daily[dayKey].count += 1
    })

    // Convert to array and sort by date (newest first)
    const dailyArr = Object.keys(daily)
      .map((key) => ({
        date: key,
        count: daily[key].count,
        fullDate: daily[key].fullDate,
      }))
      .sort((a, b) => {
        const dateA = new Date(a.date.split(".").reverse().join("-"))
        const dateB = new Date(b.date.split(".").reverse().join("-"))
        return dateB.getTime() - dateA.getTime()
      })

    setDailyRegistrations(dailyArr)
  }

  const paginatedData = dailyRegistrations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const totalPages = Math.ceil(dailyRegistrations.length / itemsPerPage)

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const renderPagination = () => {
    const pages = []
    const maxVisiblePages = 10

    if (totalPages <= maxVisiblePages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      if (currentPage <= 6) {
        for (let i = 1; i <= 8; i++) {
          pages.push(i)
        }
        pages.push("...")
        pages.push(totalPages)
      } else if (currentPage >= totalPages - 5) {
        pages.push(1)
        pages.push("...")
        for (let i = totalPages - 7; i <= totalPages; i++) {
          pages.push(i)
        }
      } else {
        pages.push(1)
        pages.push("...")
        for (let i = currentPage - 3; i <= currentPage + 3; i++) {
          pages.push(i)
        }
        pages.push("...")
        pages.push(totalPages)
      }
    }

    return pages
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 w-full">
      <AdminNavbar />

      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 w-full">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-6 py-8 text-white">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                  <span className="bg-white text-blue-700 p-3 rounded-xl shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </span>
                  Statistika Dashboard
                  {loading && (
                    <div className="ml-3">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    </div>
                  )}
                </h1>
                <p className="text-blue-100 text-lg">Kunlik ro'yxatdan o'tishlar statistikasi</p>
              </div>

              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 min-w-[200px]">
                <div className="bg-green-500 p-3 rounded-lg shadow-md">
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
                  <p className="text-sm text-blue-100 font-medium">Jami kunlar</p>
                  <p className="text-3xl font-bold">{dailyRegistrations.length}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-b bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Kunlar bo'yicha ro'yxatdan o'tishlar</h2>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sahifada:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value))
                      setCurrentPage(1)
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    Sahifa: {currentPage} / {totalPages}
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">
                    Jami: {dailyRegistrations.length} kun
                  </span>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="relative">
                <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
                <div
                  className="absolute top-0 left-0 h-24 w-24 rounded-full border-t-4 border-b-4 border-purple-500 animate-spin"
                  style={{ animationDirection: "reverse", opacity: 0.7 }}
                ></div>
              </div>
            </div>
          ) : error ? (
            <div className="p-6">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-red-500"
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
                    <p className="text-sm font-medium">{error}</p>
                  </div>
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Qayta yuklash
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto" style={{ scrollBehavior: "smooth" }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Sana
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Ro'yxatdan o'tganlar soni
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paginatedData.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg
                              className="h-12 w-12 text-gray-400 mb-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                              />
                            </svg>
                            <p className="text-lg font-medium">Ma'lumotlar topilmadi</p>
                            <p className="text-sm text-gray-400">
                              Hozircha ro'yxatdan o'tishlar statistikasi mavjud emas
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      paginatedData.map((item, index) => {
                        const globalIndex = (currentPage - 1) * itemsPerPage + index + 1

                        return (
                          <tr key={item.date} className="hover:bg-blue-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {globalIndex}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{item.fullDate}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-lg font-bold text-blue-600">{item.count}</span>
                                <span className="ml-2 text-sm text-gray-500">foydalanuvchi</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>
                      {" - "}
                      <span className="font-medium">
                        {Math.min(currentPage * itemsPerPage, dailyRegistrations.length)}
                      </span>
                      {" dan "}
                      <span className="font-medium">{dailyRegistrations.length}</span>
                      {" ta natija"}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        ← Oldingi
                      </button>

                      {renderPagination().map((page, index) => (
                        <button
                          key={index}
                          onClick={() => (typeof page === "number" ? handlePageChange(page) : null)}
                          disabled={page === "..."}
                          className={`px-3 py-2 text-sm font-medium rounded-md transition-all ${
                            page === currentPage
                              ? "bg-blue-600 text-white shadow-md"
                              : page === "..."
                                ? "text-gray-400 cursor-default"
                                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {page}
                        </button>
                      ))}

                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Keyingi →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
