// frontend/src/pages/Notifications.tsx - COMPLETA COM PAGINAÇÃO

import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { 
  Bell, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Mail,
  Eye,
  EyeOff,
  Trash2,
  Filter,
  RotateCcw,
  Calendar,
  User,
  CheckSquare,
  Settings,
  ChevronLeft,
  ChevronRight,
  Search,
  Archive,
  RefreshCw,
  Users,
  Edit,
  X,
  AlertCircle
} from 'lucide-react'

import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { 
  notificationService
} from '../services/notificationService'
import type { 
  Notification, 
  NotificationTypeLabels, 
  NotificationFilters 
} from '../types'

import { 
  NotificationTypeColors 
} from '../types'

const ITEMS_PER_PAGE = 10

const Notifications: React.FC = () => {
  // ✅ ESTADOS
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<NotificationFilters>({
    page: 1,
    limit: ITEMS_PER_PAGE,
    type: 'all',
    read: 'all'
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  
  const queryClient = useQueryClient()

  // ✅ QUERY PARA BUSCAR NOTIFICAÇÕES COM PAGINAÇÃO
  const { 
    data: notificationsResponse, 
    isLoading, 
    error,
    isFetching 
  } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => notificationService.getNotifications(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchInterval: 1000 * 60 * 5, // 5 minutos
  })

  // ✅ QUERY PARA CONTADOR NÃO LIDAS
  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: notificationService.getUnreadCount,
    refetchInterval: 1000 * 30, // 30 segundos
  })

  // ✅ MUTATIONS
  const markAsReadMutation = useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  const markAsUnreadMutation = useMutation({
    mutationFn: notificationService.markAsUnread,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: notificationService.markAllAsRead,
    onSuccess: (data) => {
      toast.success(`${data.updatedCount} notificações marcadas como lidas`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
    onError: () => {
      toast.error('Erro ao marcar todas como lidas')
    }
  })

  const deleteNotificationMutation = useMutation({
    mutationFn: notificationService.deleteNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    }
  })

  const deleteAllReadMutation = useMutation({
    mutationFn: notificationService.deleteAllRead,
    onSuccess: (data) => {
      toast.success(`${data.deletedCount} notificações lidas excluídas`)
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
    },
    onError: () => {
      toast.error('Erro ao excluir notificações lidas')
    }
  })

  // ✅ DADOS PROCESSADOS
  const notifications = notificationsResponse?.notifications || []
  const totalCount = notificationsResponse?.totalCount || 0
  const totalPages = notificationsResponse?.totalPages || 1
  const hasNextPage = notificationsResponse?.hasNextPage || false
  const hasPreviousPage = notificationsResponse?.hasPreviousPage || false
  const unreadCount = unreadData?.unreadCount || 0

  // ✅ ESTATÍSTICAS
  const stats = useMemo(() => {
    const todayCount = notifications.filter(n => 
      new Date(n.createdAt).toDateString() === new Date().toDateString()
    ).length

    const typeStats = notifications.reduce((acc, notification) => {
      acc[notification.type] = (acc[notification.type] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return { 
      unreadCount, 
      todayCount, 
      total: totalCount,
      typeStats
    }
  }, [notifications, unreadCount, totalCount])

  // ✅ FUNÇÕES DE UTILIDADE
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <Mail className="h-5 w-5" />
      case 'TASK_COMPLETED':
        return <CheckCircle className="h-5 w-5" />
      case 'TASK_OVERDUE':
        return <AlertTriangle className="h-5 w-5" />
      case 'TASK_UPDATED':
        return <Edit className="h-5 w-5" />
      case 'TASK_CANCELLED':
        return <X className="h-5 w-5" />
      case 'TASK_REASSIGNED':
        return <Users className="h-5 w-5" />
      default:
        return <Bell className="h-5 w-5" />
    }
  }

  const getNotificationColors = (type: Notification['type']) => {
    return NotificationTypeColors[type] || NotificationTypeColors.TASK_ASSIGNED
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60)
    const diffInHours = diffInMinutes / 60
    const diffInDays = diffInHours / 24

    if (diffInMinutes < 1) {
      return 'Agora mesmo'
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)}m atrás`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h atrás`
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)}d atrás`
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  // ✅ HANDLERS
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.read) {
      markAsReadMutation.mutate(notification.id)
    }
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    setFilters(prev => ({ ...prev, page: newPage }))
  }

  const handleFilterChange = (key: keyof NotificationFilters, value: any) => {
    setCurrentPage(1)
    setFilters(prev => ({ 
      ...prev, 
      [key]: value,
      page: 1 
    }))
  }

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setIsSearching(true)
      handleFilterChange('search', searchTerm.trim())
    } else {
      clearSearch()
    }
  }

  const clearSearch = () => {
    setSearchTerm('')
    setIsSearching(false)
    const { search, ...filtersWithoutSearch } = filters
    setFilters(filtersWithoutSearch)
  }

  const clearAllFilters = () => {
    setCurrentPage(1)
    setSearchTerm('')
    setIsSearching(false)
    setFilters({
      page: 1,
      limit: ITEMS_PER_PAGE,
      type: 'all',
      read: 'all'
    })
  }

  const refreshNotifications = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
    queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] })
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="text-center py-12 border-red-200 bg-red-50">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-700 mb-2">
            Erro ao carregar notificações
          </h3>
          <p className="text-red-600 mb-4">
            Tente novamente em alguns instantes
          </p>
          <Button onClick={refreshNotifications} variant="secondary">
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 scrollbar-modern">
      {/* ✅ HEADER COM ESTATÍSTICAS */}
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl shadow-lg">
              <Bell className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Notificações
              </h1>
              <p className="text-gray-600">
                Acompanhe todas as atualizações das suas tarefas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshNotifications}
              disabled={isFetching}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllAsReadMutation.isPending}
              className="flex items-center gap-2"
            >
              <CheckSquare className="h-4 w-4" />
              Marcar todas como lidas
            </Button>

            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm('Tem certeza que deseja excluir todas as notificações lidas?')) {
                  deleteAllReadMutation.mutate()
                }
              }}
              disabled={deleteAllReadMutation.isPending}
              className="flex items-center gap-2"
            >
              <Archive className="h-4 w-4" />
              Limpar lidas
            </Button>
          </div>
        </div>

        {/* ✅ ESTATÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900">{stats.unreadCount}</p>
                <p className="text-sm text-blue-700">Não lidas</p>
              </div>
            </div>
          </Card>

          <Card className="bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900">{stats.todayCount}</p>
                <p className="text-sm text-green-700">Hoje</p>
              </div>
            </div>
          </Card>

          <Card className="bg-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CheckSquare className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-purple-900">{stats.total}</p>
                <p className="text-sm text-purple-700">Total</p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* ✅ FILTROS E BUSCA */}
      <Card className="bg-gray-50 border-gray-200">
        <div className="p-6 space-y-4">
          {/* Linha 1: Busca */}
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar notificações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="flex-1"
                />
                <Button onClick={handleSearch} variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
                {isSearching && (
                  <Button onClick={clearSearch} variant="ghost">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Linha 2: Filtros */}
          <div className="flex flex-wrap gap-4">
            {/* Filtro por status de leitura */}
            <div className="flex gap-2">
              {[
                { key: 'all', label: 'Todas', count: totalCount },
                { key: false, label: 'Não lidas', count: stats.unreadCount },
                { key: true, label: 'Lidas', count: totalCount - stats.unreadCount }
              ].map(({ key, label, count }) => (
                <button
                  key={String(key)}
                  onClick={() => handleFilterChange('read', key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filters.read === key
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
                  }`}
                >
                  {label} ({count})
                </button>
              ))}
            </div>

            {/* Filtro por tipo */}
            <div className="flex gap-2">
              <select
                value={filters.type || 'all'}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="px-3 py-2 rounded-lg text-sm border border-gray-300 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Todos os tipos</option>
                <option value="TASK_ASSIGNED">Tarefas Atribuídas</option>
                <option value="TASK_UPDATED">Tarefas Atualizadas</option>
                <option value="TASK_COMPLETED">Tarefas Concluídas</option>
                <option value="TASK_OVERDUE">Tarefas Atrasadas</option>
                <option value="TASK_CANCELLED">Tarefas Canceladas</option>
                <option value="TASK_REASSIGNED">Tarefas Reatribuídas</option>
              </select>
            </div>

            {/* Limpar filtros */}
            {(filters.read !== 'all' || filters.type !== 'all' || isSearching) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-gray-500 hover:text-gray-700"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>

          {/* Indicador de resultados */}
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>
                Mostrando {notifications.length} de {totalCount} notificações
              </span>
            </div>
            
            {totalPages > 1 && (
              <span>
                Página {currentPage} de {totalPages}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* ✅ LISTA DE NOTIFICAÇÕES */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(ITEMS_PER_PAGE)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification, index) => {
            const colors = getNotificationColors(notification.type)
            
            return (
              <Card 
                key={notification.id}
                className={`
                  group cursor-pointer hover:shadow-lg transition-all duration-200 animate-fade-in
                  ${!notification.read 
                    ? `${colors.bg} ${colors.border} ring-1 ring-opacity-30` 
                    : 'hover:bg-gray-50'
                  }
                `}
                onClick={() => handleNotificationClick(notification)}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start space-x-4 p-4">
                  {/* Ícone da notificação */}
                  <div className={`
                    p-2.5 rounded-xl shadow-sm flex-shrink-0
                    ${!notification.read ? colors.bg : 'bg-gray-100'}
                  `}>
                    <div className={colors.icon}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>

                  {/* Conteúdo da notificação */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className={`
                          text-sm font-semibold truncate
                          ${!notification.read ? 'text-gray-900' : 'text-gray-700'}
                        `}>
                          {notification.title}
                        </h3>
                        
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                          {notification.message}
                        </p>

                        {notification.task && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className={`
                              inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium
                              ${colors.bg} ${colors.text}
                            `}>
                              <CheckSquare className="h-3 w-3 mr-1" />
                              {notification.task.title}
                            </span>
                          </div>
                        )}

                        {/* Metadata adicional */}
                        {notification.metadata && (
                          <div className="mt-2 text-xs text-gray-500">
                            {notification.metadata.changedFields && (
                              <span>Campos alterados: {notification.metadata.changedFields.join(', ')}</span>
                            )}
                            {notification.metadata.oldAssignee && notification.metadata.newAssignee && (
                              <span>De: {notification.metadata.oldAssignee} → Para: {notification.metadata.newAssignee}</span>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs text-gray-500 block">
                            {formatDate(notification.createdAt)}
                          </span>
                          {!notification.read && (
                            <div className="flex items-center justify-end mt-1">
                              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            </div>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!notification.read ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsReadMutation.mutate(notification.id)
                              }}
                              className="p-1 h-8 w-8"
                              title="Marcar como lida"
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                markAsUnreadMutation.mutate(notification.id)
                              }}
                              className="p-1 h-8 w-8"
                              title="Marcar como não lida"
                            >
                              <EyeOff className="h-3 w-3" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Tem certeza que deseja excluir esta notificação?')) {
                                deleteNotificationMutation.mutate(notification.id)
                              }
                            }}
                            className="p-1 h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            title="Excluir notificação"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        <Card className="text-center py-16">
          <div className="max-w-md mx-auto">
            <div className="p-4 bg-gray-100 rounded-full w-fit mx-auto mb-6">
              <Bell className="h-16 w-16 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {isSearching ? 'Nenhum resultado encontrado' :
               filters.read === false ? 'Todas as notificações foram lidas!' :
               'Nenhuma notificação'
              }
            </h3>
            <p className="text-gray-600 mb-8">
              {isSearching ? 'Tente buscar com outros termos.' :
               filters.read === false ? 'Parabéns! Você está em dia com todas as suas notificações.' :
               'Você está em dia com todas as suas tarefas!'
              }
            </p>
            
            {(filters.read !== 'all' || filters.type !== 'all' || isSearching) && (
              <Button onClick={clearAllFilters} className="mt-4">
                <RotateCcw className="h-4 w-4 mr-2" />
                Ver todas as notificações
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ✅ PAGINAÇÃO */}
      {totalPages > 1 && (
        <Card className="bg-gray-50">
          <div className="flex items-center justify-between p-4">
            <div className="text-sm text-gray-600">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} a {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} notificações
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!hasPreviousPage || isLoading}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber
                  
                  if (totalPages <= 5) {
                    pageNumber = i + 1
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1
                  } else if (currentPage > totalPages - 3) {
                    pageNumber = totalPages - 4 + i
                  } else {
                    pageNumber = currentPage - 2 + i
                  }

                  return (
                    <Button
                      key={pageNumber}
                      variant={currentPage === pageNumber ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => handlePageChange(pageNumber)}
                      className="w-8 h-8"
                    >
                      {pageNumber}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!hasNextPage || isLoading}
                className="flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

export default Notifications