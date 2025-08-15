"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import axios from "axios"
import AdminNavbar from "@/components/Navbar"
import * as XLSX from "xlsx"

interface User {
  id: number | string
  full_name: string
  phone_number: string
  tg_user: string
  createdAt: string
}

interface PaginationInfo {
  currentPage: number
  totalPages: number
  totalUsers: number
  usersPerPage: number
}

export default function Dashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [allUsers, setAllUsers] = useState<User[]>([]) // For Excel export
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    usersPerPage: 50,
  })
  const router = useRouter()

  // Check authentication
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("isAuthenticated") !== "true") {
      router.push("/")
    }
  }, [router])

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setCurrentPage(1)
      fetchUsers(1, term)
    }, 500),
    [],
  )

  // Handle search input change
  useEffect(() => {
    if (searchTerm) {
      debouncedSearch(searchTerm)
    } else {
      fetchUsers(currentPage)
    }
  }, [searchTerm, debouncedSearch])

  // Fetch users with pagination and search
  const fetchUsers = async (page = 1, search = "") => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.usersPerPage.toString(),
        ...(search && { search }),
      })

      const res = await axios.get(`https://orqa.imanakhmedovna.uz/users?${params}`)

      if (res.data && res.data.users) {
        setUsers(res.data.users)
        setPagination({
          currentPage: res.data.currentPage || page,
          totalPages: res.data.totalPages || 1,
          totalUsers: res.data.totalUsers || res.data.users.length,
          usersPerPage: res.data.usersPerPage || 50,
        })
      } else {
        // Fallback for old API format
        setUsers(res.data)
        setPagination((prev) => ({
          ...prev,
          totalUsers: res.data.length,
          totalPages: Math.ceil(res.data.length / prev.usersPerPage),
        }))
      }
    } catch (error) {
      console.error("Foydalanuvchilarni yuklashda xatolik:", error)
      setError("Foydalanuvchilarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
    } finally {
      setLoading(false)
    }
  }

  // Fetch all users for Excel export
  const fetchAllUsers = async () => {
    try {
      setExportLoading(true)
      const res = await axios.get(`https://orqa.imanakhmedovna.uz/users`)
      setAllUsers(res.data)
      return res.data
    } catch (error) {
      console.error("Barcha foydalanuvchilarni yuklashda xatolik:", error)
      throw new Error("Ma'lumotlarni yuklashda xatolik yuz berdi")
    } finally {
      setExportLoading(false)
    }
  }

  // Enhanced Excel export function
  const downloadExcel = async () => {
    try {
      setExportLoading(true)

      let exportData = allUsers
      if (allUsers.length === 0) {
        exportData = await fetchAllUsers()
      }

      // Prepare data for Excel
      const excelData = exportData.map((user, index) => ({
        "№": index + 1,
        "To'liq ismi": user.full_name || "Kiritilmagan",
        "Telefon raqami": user.phone_number || "Kiritilmagan",
        Telegram: user.tg_user || "Kiritilmagan",
        "Ro'yxatdan o'tgan sana": user.createdAt
          ? new Date(user.createdAt).toLocaleString("uz-UZ", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Noma'lum",
      }))

      // Create workbook and worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // Set column widths
      const colWidths = [
        { wch: 5 }, // №
        { wch: 25 }, // To'liq ismi
        { wch: 15 }, // Telefon
        { wch: 20 }, // Telegram
        { wch: 20 }, // Sana
      ]
      ws["!cols"] = colWidths

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Foydalanuvchilar")

      // Generate filename with current date
      const currentDate = new Date().toISOString().split("T")[0]
      const filename = `foydalanuvchilar_${currentDate}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)

      // Show success message
      alert(`Excel fayl muvaffaqiyatli yuklandi! (${exportData.length} ta foydalanuvchi)`)
    } catch (error) {
      console.error("Excel yuklashda xatolik:", error)
      alert("Excel faylni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
    }
  }

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    fetchUsers(page, searchTerm)
  }

  // Initial load
  useEffect(() => {
    fetchUsers(1)
  }, [])

  // Calculate today's registrations
  const todayRegistrations = useMemo(() => {
    const today = new Date().toISOString().split("T")[0]
    return users.filter((user) => user.createdAt && new Date(user.createdAt).toISOString().split("T")[0] === today)
      .length
  }, [users])

  // Validate and clean user data
  const validateUserData = (user: User) => ({
    ...user,
    full_name: user.full_name?.trim() || "Kiritilmagan",
    phone_number: user.phone_number?.trim() || "Kiritilmagan",
    tg_user: user.tg_user?.trim() || "Kiritilmagan",
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <AdminNavbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Enhanced Header with better stats */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-6 py-8 text-white">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
              <div>
                <h1 className="text-4xl font-bold flex items-center gap-3 mb-2">
                  <span className="bg-white text-blue-700 p-3 rounded-xl shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  Admin Dashboard
                </h1>
                <p className="text-blue-100 text-lg">Iman Akhmedovna vebinar foydalanuvchilari boshqaruvi</p>
              </div>

              <div className="flex flex-wrap gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 min-w-[200px]">
                  <div className="bg-blue-500 p-3 rounded-lg shadow-md">
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
                    <p className="text-sm text-blue-100 font-medium">Jami foydalanuvchilar</p>
                    <p className="text-3xl font-bold flex items-center">
                      {pagination.totalUsers.toLocaleString()}
                      <span className="ml-2 flex items-center">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="ml-1 text-xs font-normal text-green-300">LIVE</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 flex items-center gap-3 min-w-[180px]">
                  <div className="bg-purple-500 p-3 rounded-lg shadow-md">
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm text-blue-100 font-medium">Bugun qo'shilganlar</p>
                    <p className="text-3xl font-bold">{todayRegistrations}</p>
                  </div>
                </div>

                <button
                  onClick={downloadExcel}
                  disabled={exportLoading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white px-6 py-4 rounded-xl transition-all shadow-lg flex items-center gap-3 font-semibold min-w-[160px] justify-center"
                >
                  {exportLoading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Yuklanmoqda...
                    </>
                  ) : (
                    <>
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
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Excel yuklash
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Enhanced Search bar */}
          <div className="p-6 border-b bg-gray-50">
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg
                    className="h-5 w-5 text-gray-400"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Ism, telefon yoki telegram bo'yicha qidirish..."
                  className="pl-10 pr-4 py-3 w-full rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                  Sahifa: {pagination.currentPage} / {pagination.totalPages}
                </span>
                <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">
                  Jami: {pagination.totalUsers} ta
                </span>
              </div>
            </div>
          </div>

          {/* Enhanced Table content */}
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
                  onClick={() => fetchUsers(currentPage, searchTerm)}
                  className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                  Qayta urinish
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        To'liq ismi
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Telefon raqami
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Telegram
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Ro'yxatdan o'tgan sana
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
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
                            <p className="text-lg font-medium">Foydalanuvchilar topilmadi</p>
                            <p className="text-sm text-gray-400">
                              Qidiruv shartlaringizni o'zgartiring yoki keyinroq qayta urinib ko'ring
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user, index) => {
                        const validatedUser = validateUserData(user)
                        const globalIndex = (pagination.currentPage - 1) * pagination.usersPerPage + index + 1

                        return (
                          <tr key={user.id} className="hover:bg-blue-50 transition-colors duration-200">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {globalIndex}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{validatedUser.full_name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700 font-mono">{validatedUser.phone_number}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {validatedUser.tg_user !== "Kiritilmagan" ? (
                                <a
                                  href={`https://t.me/${validatedUser.tg_user.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-5 w-5 text-blue-500"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                  </svg>
                                  {validatedUser.tg_user}
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm italic">{validatedUser.tg_user}</span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                              {validatedUser.createdAt
                                ? new Date(validatedUser.createdAt).toLocaleString("uz-UZ", {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Noma'lum"}
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Enhanced Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      <span className="font-medium">{(pagination.currentPage - 1) * pagination.usersPerPage + 1}</span>
                      {" - "}
                      <span className="font-medium">
                        {Math.min(pagination.currentPage * pagination.usersPerPage, pagination.totalUsers)}
                      </span>
                      {" dan "}
                      <span className="font-medium">{pagination.totalUsers}</span>
                      {" ta natija"}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Oldingi
                      </button>

                      {/* Page numbers */}
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        let pageNum
                        if (pagination.totalPages <= 5) {
                          pageNum = i + 1
                        } else if (pagination.currentPage <= 3) {
                          pageNum = i + 1
                        } else if (pagination.currentPage >= pagination.totalPages - 2) {
                          pageNum = pagination.totalPages - 4 + i
                        } else {
                          pageNum = pagination.currentPage - 2 + i
                        }

                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-2 text-sm font-medium rounded-md ${
                              pageNum === pagination.currentPage
                                ? "bg-blue-600 text-white"
                                : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}

                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Keyingi
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

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }) as T
}
