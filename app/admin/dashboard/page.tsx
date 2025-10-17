"use client"

import type React from "react"

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
  const [itemsPerPage, setItemsPerPage] = useState(10) // Changed default to 10
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalUsers: 0,
    usersPerPage: 10, // Changed default to 10
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
    }, 300),
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

  useEffect(() => {
    setCurrentPage(1)
    fetchUsers(1, searchTerm)
  }, [itemsPerPage])

  const fetchUsers = async (page = 1, search = "") => {
    try {
      setLoading(true)
      setError("")

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
      })

      if (search && search.trim()) {
        params.append("search", search.trim())
      }

      console.log("[v0] Fetching users with params:", params.toString())

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      const res = await axios.get(`https://backend.imanakhmedovna.uz/user?${params}`, {
        signal: controller.signal,
        timeout: 8000,
      })

      clearTimeout(timeoutId)

      console.log("[v0] API Response:", {
        dataLength: res.data?.length,
        headers: res.headers,
        totalCount: res.headers["x-total-count"],
      })

      if (res.data && Array.isArray(res.data)) {
        const processedUsers = res.data.map((user) => ({
          ...user,
          full_name: user.full_name?.trim() || "Kiritilmagan",
          phone_number: user.phone_number?.trim() || "Kiritilmagan",
          tg_user: user.tg_user?.trim() || "Kiritilmagan",
        }))

        const startIndex = (page - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const paginatedUsers = processedUsers.slice(startIndex, endIndex)

        console.log("[v0] Pagination slicing:", {
          totalUsers: processedUsers.length,
          startIndex,
          endIndex,
          paginatedUsers: paginatedUsers.length,
          itemsPerPage,
        })

        setUsers(paginatedUsers)

        const totalUsers = res.headers["x-total-count"]
          ? Number.parseInt(res.headers["x-total-count"])
          : processedUsers.length
        const totalPages = Math.ceil(totalUsers / itemsPerPage)

        console.log("[v0] Pagination calculated:", {
          totalUsers,
          totalPages,
          currentPage: page,
          itemsPerPage,
        })

        setPagination({
          currentPage: page,
          totalPages: totalPages,
          totalUsers: totalUsers,
          usersPerPage: itemsPerPage,
        })
      }
    } catch (error: any) {
      console.error("Foydalanuvchilarni yuklashda xatolik:", error)
      if (error.name === "AbortError") {
        setError("So'rov vaqti tugadi. Iltimos, qayta urinib ko'ring.")
      } else if (error.code === "ECONNABORTED") {
        setError("Internet aloqasi sekin. Iltimos, qayta urinib ko'ring.")
      } else {
        setError("Foydalanuvchilarni yuklashda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.")
      }
    } finally {
      setLoading(false)
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
    } finally {
      setExportLoading(false)
    }
  }

  const fetchAllUsers = async () => {
    try {
      setExportLoading(true)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout for export

      const res = await axios.get(`https://backend.imanakhmedovna.uz/user`, {
        signal: controller.signal,
        timeout: 30000,
      })

      clearTimeout(timeoutId)
      setAllUsers(res.data)
      return res.data
    } catch (error) {
      console.error("Barcha foydalanuvchilarni yuklashda xatolik:", error)
      throw new Error("Ma'lumotlarni yuklashda xatolik yuz berdi")
    } finally {
      setExportLoading(false)
    }
  }

  const handlePageChange = (page: number) => {
    console.log("[v0] Changing to page:", page)
    setCurrentPage(page)
    fetchUsers(page, searchTerm)
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleSearch = () => {
    console.log("[v0] Manual search triggered with term:", searchTerm)
    setCurrentPage(1)
    fetchUsers(1, searchTerm)
  }

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
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

  const renderPagination = () => {
    const totalPages = pagination.totalPages
    const currentPage = pagination.currentPage
    const pages = []

    // Always show first page
    if (totalPages > 0) {
      pages.push(1)
    }

    // Add ellipsis and current page area
    if (currentPage > 4) {
      pages.push("...")
    }

    // Add pages around current page
    for (let i = Math.max(2, currentPage - 2); i <= Math.min(totalPages - 1, currentPage + 2); i++) {
      if (!pages.includes(i)) {
        pages.push(i)
      }
    }

    // Add ellipsis and last page
    if (currentPage < totalPages - 3) {
      if (!pages.includes("...")) {
        pages.push("...")
      }
    }

    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages)
    }

    return pages
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 w-full">
      <AdminNavbar />

      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-100 w-full">
          {/* Enhanced Header with better stats */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 px-4 sm:px-6 py-6 sm:py-8 text-white">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
              <div>
                <h1 className="text-2xl sm:text-4xl font-bold flex items-center gap-2 sm:gap-3 mb-2">
                  <span className="bg-white text-blue-700 p-2 sm:p-3 rounded-lg sm:rounded-xl shadow-lg">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6 sm:h-8 sm:w-8"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  Admin Dashboard
                </h1>
                <p className="text-blue-100 text-sm sm:text-lg">
                 Iman Akhmedovna | Admin Panel
                </p>
              </div>

              <div className="flex flex-wrap gap-2 sm:gap-4 w-full lg:w-auto">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-[160px] sm:min-w-[200px] flex-1 lg:flex-none">
                  <div className="bg-blue-500 p-2 sm:p-3 rounded-lg shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-6 sm:w-6"
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
                    <p className="text-xs sm:text-sm text-blue-100 font-medium">Jami foydalanuvchilar</p>
                    <p className="text-xl sm:text-3xl font-bold flex items-center">
                      {pagination.totalUsers.toLocaleString()}
                      <span className="ml-2 flex items-center">
                        <span className="relative flex h-2 w-2 sm:h-3 sm:w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 sm:h-3 sm:w-3 bg-green-500"></span>
                        </span>
                        <span className="ml-1 text-xs font-normal text-green-300">LIVE</span>
                      </span>
                    </p>
                  </div>
                </div>

                <div className="bg-white/20 backdrop-blur-sm rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-3 min-w-[140px] sm:min-w-[180px] flex-1 lg:flex-none">
                  <div className="bg-purple-500 p-2 sm:p-3 rounded-lg shadow-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 sm:h-6 sm:w-6"
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
                    <p className="text-xs sm:text-sm text-blue-100 font-medium">Bugun qo'shilganlar</p>
                    <p className="text-xl sm:text-3xl font-bold">{todayRegistrations}</p>
                  </div>
                </div>

                <button
                  onClick={downloadExcel}
                  disabled={exportLoading}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white px-4 sm:px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl transition-all shadow-lg flex items-center gap-2 sm:gap-3 font-semibold min-w-[140px] sm:min-w-[160px] justify-center text-sm sm:text-base"
                >
                  {exportLoading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 sm:h-5 sm:w-5"
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
                      <span className="hidden sm:inline">Yuklanmoqda...</span>
                      <span className="sm:hidden">Yuklanmoqda</span>
                    </>
                  ) : (
                    <>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 sm:h-6 sm:w-6"
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
                      <span className="hidden sm:inline">Excel yuklash</span>
                      <span className="sm:hidden">Excel</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-6 border-b bg-gray-50">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="relative flex-1 max-w-md w-full">
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
                  className="pl-10 pr-20 py-3 w-full rounded-xl border-2 border-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base"
                  value={searchTerm}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchTerm(value)
                  }}
                  onKeyPress={handleSearchKeyPress}
                />
                <button
                  onClick={handleSearch}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 rounded-r-xl transition-all"
                >
                  <svg
                    className="h-4 w-4 sm:h-5 sm:w-5"
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
                </button>
                {searchTerm && (
                  <button
                    onClick={() => {
                      setSearchTerm("")
                      setCurrentPage(1)
                      fetchUsers(1, "")
                    }}
                    className="absolute inset-y-0 right-12 sm:right-16 pr-2 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full lg:w-auto">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Sahifada:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-sm"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                    Sahifa: {pagination.currentPage} / {pagination.totalPages}
                  </span>
                  <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full font-medium">
                    Jami: {pagination.totalUsers} ta
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Table content */}
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="relative">
                <div className="h-16 w-16 sm:h-24 sm:w-24 rounded-full border-t-4 border-b-4 border-blue-500 animate-spin"></div>
                <div
                  className="absolute top-0 left-0 h-16 w-16 sm:h-24 sm:w-24 rounded-full border-t-4 border-b-4 border-purple-500 animate-spin"
                  style={{ animationDirection: "reverse", opacity: 0.7 }}
                ></div>
              </div>
            </div>
          ) : error ? (
            <div className="p-4 sm:p-6">
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 sm:p-6 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-6 w-6 text-red-500"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
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
              <div className="overflow-x-auto" style={{ scrollBehavior: "smooth" }}>
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        To'liq ismi
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Telefon raqami
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Telegram
                      </th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                        Ro'yxatdan o'tgan sana
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 sm:px-6 py-8 sm:py-12 text-center text-gray-500">
                          <div className="flex flex-col items-center">
                            <svg
                              className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mb-4"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 00-.707.293h-3.172a1 1 0 00-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                              />
                            </svg>
                            <p className="text-base sm:text-lg font-medium">Foydalanuvchilar topilmadi</p>
                            <p className="text-xs sm:text-sm text-gray-400">
                              Qidiruv shartlaringizni o'zgartiring yoki keyinroq qayta urinib ko'ring
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      users.map((user, index) => {
                        const globalIndex = (pagination.currentPage - 1) * itemsPerPage + index + 1

                        return (
                          <tr key={user.id} className="hover:bg-blue-50 transition-colors duration-200">
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {globalIndex}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">{user.full_name}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-700 font-mono">{user.phone_number}</div>
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                              {user.tg_user !== "Kiritilmagan" ? (
                                <a
                                  href={`https://t.me/${user.tg_user.replace("@", "")}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 flex items-center gap-2 text-sm font-medium transition-colors"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
                                    <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
                                  </svg>
                                  <span className="hidden sm:inline">{user.tg_user}</span>
                                  <span className="sm:hidden">
                                    {user.tg_user.length > 10 ? user.tg_user.substring(0, 10) + "..." : user.tg_user}
                                  </span>
                                </a>
                              ) : (
                                <span className="text-gray-400 text-sm italic">{user.tg_user}</span>
                              )}
                            </td>
                            <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-gray-600">
                              {user.createdAt
                                ? new Date(user.createdAt).toLocaleString("uz-UZ", {
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

              {pagination.totalPages > 1 && (
                <div className="bg-gray-50 px-4 sm:px-6 py-4 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-sm text-gray-700 text-center sm:text-left">
                      <span className="font-medium">{(pagination.currentPage - 1) * itemsPerPage + 1}</span>
                      {" - "}
                      <span className="font-medium">
                        {Math.min(pagination.currentPage * itemsPerPage, pagination.totalUsers)}
                      </span>
                      {" dan "}
                      <span className="font-medium">{pagination.totalUsers}</span>
                      {" ta natija"}
                    </div>

                    <div className="flex items-center space-x-1 overflow-x-auto">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <span className="hidden sm:inline">← Oldingi</span>
                        <span className="sm:hidden">←</span>
                      </button>

                      {renderPagination().map((page, index) => (
                        <button
                          key={index}
                          onClick={() => (typeof page === "number" ? handlePageChange(page) : null)}
                          disabled={page === "..."}
                          className={`px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-md transition-all ${
                            page === pagination.currentPage
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
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <span className="hidden sm:inline">Keyingi →</span>
                        <span className="sm:hidden">→</span>
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

function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout
  return ((...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func.apply(null, args), wait)
  }) as T
}
