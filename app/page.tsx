'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { ExternalLink } from 'lucide-react'

interface Job {
  id: string
  company_name: string
  role_title: string
  location: string
  compensation: string
  posting_date: string
  application_link: string
  work_mode: string
  role_level: string
}

export default function Dashboard() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [workModeFilter, setWorkModeFilter] = useState<string>('all')
  const [roleLevelFilter, setRoleLevelFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })

  const fetchJobs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (workModeFilter !== 'all') params.append('work_mode', workModeFilter)
      if (roleLevelFilter !== 'all') params.append('role_level', roleLevelFilter)
      params.append('page', page.toString())
      params.append('limit', '50')

      const response = await fetch(`/api/jobs?${params.toString()}`)
      const data = await response.json()
      setJobs(data.jobs || [])
      setPagination(data.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      })
    } catch (error) {
      console.error('Error fetching jobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }, [workModeFilter, roleLevelFilter, page])

  useEffect(() => {
    fetchJobs()
  }, [fetchJobs])

  const columns = useMemo<ColumnDef<Job>[]>(
    () => [
      {
        accessorKey: 'company_name',
        header: 'Company',
        cell: (info) => (
          <div className="font-medium">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'role_title',
        header: 'Role',
        cell: (info) => <div>{info.getValue() as string}</div>,
      },
      {
        accessorKey: 'location',
        header: 'Location',
        cell: (info) => (
          <div className="text-muted-foreground">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'compensation',
        header: 'Compensation',
        cell: (info) => (
          <div className="text-muted-foreground">{info.getValue() as string}</div>
        ),
      },
      {
        accessorKey: 'posting_date',
        header: 'Posted',
        cell: (info) => {
          const date = new Date(info.getValue() as string)
          return (
            <div className="text-muted-foreground">
              {date.toLocaleDateString()}
            </div>
          )
        },
      },
      {
        accessorKey: 'application_link',
        header: 'Apply',
        cell: (info) => {
          const link = info.getValue() as string
          const isValidLink = link && (link.startsWith('http://') || link.startsWith('https://'))
          
          if (!isValidLink) {
            return <span className="text-muted-foreground text-sm">N/A</span>
          }
          
          return (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors font-medium text-sm"
              onClick={(e) => {
                if (!isValidLink) {
                  e.preventDefault()
                }
              }}
            >
              Apply
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )
        },
      },
    ],
    []
  )

  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
    state: {
      pagination: {
        pageIndex: page - 1,
        pageSize: pagination.limit,
      },
    },
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-10 px-4 max-w-7xl">
        <div className="mb-10">
          <h1 className="text-5xl font-bold mb-3 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
            Job Aggregation Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Aggregated startup and VC job listings from 30+ sources
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 flex flex-wrap gap-4 items-center p-4 bg-card rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <label htmlFor="work-mode" className="text-sm font-medium text-foreground">
              Work Mode:
            </label>
            <Select value={workModeFilter} onValueChange={(value) => {
              setWorkModeFilter(value)
              setPage(1)
            }}>
              <SelectTrigger className="w-[180px]" id="work-mode">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Remote">Remote</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
                <SelectItem value="Onsite">Onsite</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="role-level" className="text-sm font-medium text-foreground">
              Role Level:
            </label>
            <Select value={roleLevelFilter} onValueChange={(value) => {
              setRoleLevelFilter(value)
              setPage(1)
            }}>
              <SelectTrigger className="w-[180px]" id="role-level">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="Entry">Entry</SelectItem>
                <SelectItem value="Mid">Mid</SelectItem>
                <SelectItem value="Senior">Senior</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="ml-auto text-sm text-muted-foreground font-medium">
            Showing {jobs.length} of {pagination.total} jobs
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-lg">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border bg-secondary/50">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="font-semibold text-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : jobs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No jobs found.
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-secondary/30 border-border">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="text-foreground">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="mt-6 flex items-center justify-between p-4 bg-card rounded-lg border border-border">
          <div className="text-sm text-muted-foreground font-medium">
            Page {page} of {pagination.totalPages || 1}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page === 1 || loading}
              className="border-border hover:bg-primary hover:text-primary-foreground"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((prev) => Math.min(pagination.totalPages || 1, prev + 1))}
              disabled={page === (pagination.totalPages || 1) || loading}
              className="border-border hover:bg-primary hover:text-primary-foreground"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

