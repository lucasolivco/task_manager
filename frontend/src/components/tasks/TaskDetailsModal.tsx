// frontend/src/components/tasks/TaskDetailsModal.tsx - VERSÃO ATUALIZADA

import React, { useEffect, useState } from 'react'
import { 
  X, 
  Calendar, 
  User, 
  Clock, 
  Target, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Pause,
  MessageSquare,
  Paperclip,
  Send,
  Download,
  FileText,
  Image,
  File,
  Loader2,
  CalendarPlus,
  Trash2
} from 'lucide-react'
import { toast } from 'sonner'
import { TaskStatusLabels, TaskPriorityLabels } from '../../types'
import type { Task } from '../../types'
import { getTaskComments, createComment, type Comment } from '../../services/commentService'
import { getTaskAttachments, uploadAttachments, downloadAttachment, deleteAttachment, type Attachment } from '../../services/attachmentService'
import Portal from '../ui/Portal'
import moment from 'moment-timezone'
import { formatTaskIdForDisplay } from '../../utils/formatters' // ✅ NOVO: Importar a função

// ... (interface TaskDetailsModalProps permanece a mesma)
interface TaskDetailsModalProps {
  task: Task
  isOpen: boolean
  onClose: () => void
  userRole: string
  currentUser?: { id: string; name: string; email: string }
}


const TaskDetailsModal: React.FC<TaskDetailsModalProps> = ({
  task,
  isOpen,
  onClose,
  userRole,
  currentUser
}) => {
  // ... (todos os useState e hooks permanecem os mesmos)
  const [newComment, setNewComment] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false)
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [isUploadingFile, setIsUploadingFile] = useState(false)
  const [isDeletingAttachment, setIsDeletingAttachment] = useState<string | null>(null)
  const [isDeletingComment, setIsDeletingComment] = useState<string | null>(null)

  if (!currentUser) {
    console.warn('TaskDetailsModal: currentUser não fornecido')
    if (!isOpen) return null
  }

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }
    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  useEffect(() => {
    if (isOpen && task.id) {
      loadComments()
      loadAttachments()
    }
  }, [isOpen, task.id])

  if (!isOpen) return null

  // ✅ NOVO: Gerar o ID de exibição
  const displayId = formatTaskIdForDisplay(task.id);

  // ... (todas as funções como loadComments, loadAttachments, etc., permanecem as mesmas)
  const loadComments = async () => {
    setIsLoadingComments(true)
    try {
      const data = await getTaskComments(task.id)
      setComments(data.comments)
    } catch (error: any) {
      console.error('Erro ao carregar comentários:', error)
      toast.error('Erro ao carregar comentários')
    } finally {
      setIsLoadingComments(false)
    }
  }

  const loadAttachments = async () => {
    setIsLoadingAttachments(true)
    try {
      const data = await getTaskAttachments(task.id)
      setAttachments(data.attachments)
    } catch (error: any) {
      console.error('Erro ao carregar anexos:', error)
      toast.error('Erro ao carregar anexos')
    } finally {
      setIsLoadingAttachments(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploadingFile(true)
    
    try {
      const filesArray = Array.from(files)
      const data = await uploadAttachments(task.id, filesArray)
      
      setAttachments(prev => [...data.attachments, ...prev])
      toast.success(data.message)
      
      e.target.value = ''
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error)
      toast.error(error.response?.data?.error || 'Erro ao fazer upload do arquivo')
    } finally {
      setIsUploadingFile(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    setIsSubmittingComment(true)
    
    try {
      const data = await createComment(task.id, newComment.trim())
      
      setComments(prev => [...prev, data.comment])
      setNewComment('')
      toast.success('Comentário adicionado com sucesso')
    } catch (error: any) {
      console.error('Erro ao enviar comentário:', error)
      toast.error(error.response?.data?.error || 'Erro ao enviar comentário')
    } finally {
      setIsSubmittingComment(false)
    }
  }

  const handleDownload = async (attachment: Attachment) => {
    try {
      await downloadAttachment(attachment.id, attachment.originalName)
      toast.success(`Download de ${attachment.originalName} iniciado`)
    } catch (error: any) {
      console.error('Erro ao fazer download:', error)
      toast.error('Erro ao fazer download do arquivo')
    }
  }

  const handleDeleteAttachment = async (attachment: Attachment) => {
    if (!confirm(`Tem certeza que deseja excluir o arquivo "${attachment.originalName}"?`)) {
      return
    }

    setIsDeletingAttachment(attachment.id)
    
    try {
      const data = await deleteAttachment(attachment.id)
      
      setAttachments(prev => prev.filter(a => a.id !== attachment.id))
      toast.success(`Arquivo "${data.fileName}" excluído com sucesso`)
    } catch (error: any) {
      console.error('Erro ao excluir anexo:', error)
      toast.error(error.response?.data?.error || 'Erro ao excluir arquivo')
    } finally {
      setIsDeletingAttachment(null)
    }
  }

  const canDeleteAttachment = (attachment: Attachment): boolean => {
    if (userRole === 'MANAGER') return true
    if (attachment.uploadedBy.id === currentUser?.id) return true
    if (task.createdBy.id === currentUser?.id) return true
    return false
  }

  const canDeleteComment = (comment: Comment): boolean => {
    if (userRole === 'MANAGER') return true
    if (comment.author.id === currentUser?.id) return true
    if (task.createdBy.id === currentUser?.id) return true
    return false
  }

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED'
  const isNearTarget = task.targetDate && new Date(task.targetDate) < new Date() && task.status !== 'COMPLETED'

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED': return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'IN_PROGRESS': return <Clock className="h-5 w-5 text-blue-600" />
      case 'CANCELLED': return <XCircle className="h-5 w-5 text-gray-600" />
      default: return <Pause className="h-5 w-5 text-gray-600" />
    }
  }

  const getPriorityStyles = (priority: Task['priority']) => {
    switch (priority) {
      case 'URGENT': return {
        text: 'text-purple-700 bg-purple-50 border-purple-200',
        icon: '🚨'
      }
      case 'HIGH': return {
        text: 'text-orange-700 bg-orange-50 border-orange-200',
        icon: '⚡'
      }
      case 'MEDIUM': return {
        text: 'text-blue-700 bg-blue-50 border-blue-200',
        icon: '📋'
      }
      case 'LOW': return {
        text: 'text-slate-700 bg-slate-50 border-slate-200',
        icon: '📝'
      }
      default: return {
        text: 'text-blue-700 bg-blue-50 border-blue-200',
        icon: '📋'
      }
    }
  }

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <Image className="h-4 w-4 md:h-5 md:w-5 text-blue-500" />
    }
    if (['pdf'].includes(extension || '')) {
      return <FileText className="h-4 w-4 md:h-5 md:w-5 text-red-500" />
    }
    return <File className="h-4 w-4 md:h-5 md:w-5 text-gray-500" />
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDateBrazil = (dateString: string) => {
    if (!dateString) return ''
    
    try {
      const date = moment(dateString).tz('America/Sao_Paulo')
      return date.format('DD/MM/YYYY')
    } catch (error) {
      console.error('Erro ao formatar data:', error)
      return 'Data inválida'
    }
  }

  const priorityStyles = getPriorityStyles(task.priority)


  return (
    <Portal>
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-50"
        onClick={onClose}
      />

      <div className="fixed inset-0 flex items-center justify-center p-2 md:p-4 z-50">
        <div 
          className="bg-white rounded-xl md:rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start md:items-center justify-between p-4 md:p-6 border-b border-gray-200 bg-white">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 min-w-0 flex-1 mr-4">
              <h2 className="text-lg md:text-2xl font-bold text-gray-900 line-clamp-2">{task.title}</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {/* ✅ NOVO: Exibindo o ID formatado */}
                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                  {displayId}
                </span>

                <div className="flex items-center gap-2">
                  {getStatusIcon(task.status)}
                  <span className={`text-xs md:text-sm font-medium`}>
                    {TaskStatusLabels[task.status]}
                  </span>
                </div>
                <span className={`inline-flex items-center px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm font-semibold border ${priorityStyles.text}`}>
                  <span className="mr-1">{priorityStyles.icon}</span>
                  {TaskPriorityLabels[task.priority]}
                </span>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            >
              <X className="h-5 w-5 md:h-6 md:w-6" />
            </button>
          </div>

          {/* O restante do componente permanece exatamente o mesmo, sem alterações */}
          {/* ... */}
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* Conteúdo principal */}
            <div className="flex-1 lg:flex-1 overflow-y-auto max-h-[40vh] lg:max-h-none">
              <div className="p-4 md:p-6 space-y-4 md:space-y-6">
                
                {/* Alertas de datas */}
                {(isOverdue || isNearTarget) && (
                  <div className="space-y-2">
                    {isOverdue && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="h-5 w-5 text-red-600 animate-pulse flex-shrink-0" />
                        <span className="text-red-700 font-medium text-sm">
                          Esta tarefa está atrasada!
                        </span>
                      </div>
                    )}
                    {isNearTarget && !isOverdue && (
                      <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <Target className="h-5 w-5 text-orange-600 animate-pulse flex-shrink-0" />
                        <span className="text-orange-700 font-medium text-sm">
                          Meta próxima do vencimento!
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Descrição */}
                {task.description && (
                  <div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">Descrição</h3>
                    <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg line-clamp-3 lg:line-clamp-none">
                      {task.description}
                    </p>
                  </div>
                )}

                {/* Informações principais */}
                <div>
                  <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-3">Informações</h3>
                  <div className="grid grid-cols-2 gap-2 md:gap-4">
                    
                    <div className="flex items-center gap-2 p-2 md:p-3 bg-blue-50 rounded-lg">
                      <User className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-blue-600">Responsável</p>
                        <p className="font-medium text-xs md:text-sm text-blue-700 truncate">{task.assignedTo.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                      <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-600">Criado por</p>
                        <p className="font-medium text-xs md:text-sm text-gray-900 truncate">{task.createdBy.name}</p>
                      </div>
                    </div>

                    {task.dueDate ? (
                      <div className="flex items-center gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-600">Vence em</p>
                          <p className={`font-medium text-xs md:text-sm ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                            {formatDateBrazil(task.dueDate)}
                            {isOverdue && (
                              <span className="ml-1 text-red-600 animate-pulse">⚠️</span>
                            )}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2 md:p-3 bg-gray-50 rounded-lg">
                        <CalendarPlus className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-gray-600">Sem prazo</p>
                          <p className="font-medium text-xs md:text-sm text-gray-500">
                            Não definido
                          </p>
                        </div>
                      </div>
                    )}

                    {task.targetDate && (
                      <div className="flex items-center gap-2 p-2 md:p-3 bg-blue-50 rounded-lg">
                        <Target className="h-4 w-4 text-blue-500 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs text-blue-600">Data Meta</p>
                          <p className={`font-medium text-xs md:text-sm ${isNearTarget ? 'text-orange-600' : 'text-blue-700'}`}>
                            {formatDateBrazil(task.targetDate)}
                            {isNearTarget && (
                              <span className="ml-1 text-orange-600 animate-pulse">🎯</span>
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ANEXOS COM BOTÃO DELETE */}
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                      <Paperclip className="h-4 w-4" />
                      Anexos ({attachments.length})
                      {isLoadingAttachments && <Loader2 className="h-4 w-4 animate-spin" />}
                    </h3>
                    <label className={`cursor-pointer text-white px-3 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm ${
                      isUploadingFile 
                        ? 'bg-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700'
                    }`}>
                      {isUploadingFile ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Paperclip className="h-3 w-3" />
                          <span className="hidden sm:inline">Adicionar</span>
                          <span className="sm:hidden">+</span>
                        </>
                      )}
                      <input
                        type="file"
                        multiple
                        onChange={handleFileUpload}
                        disabled={isUploadingFile}
                        className="hidden"
                        accept="*/*"
                      />
                    </label>
                  </div>

                  {isLoadingAttachments ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Carregando...</span>
                    </div>
                  ) : attachments.length > 0 ? (
                    <div className="space-y-2 max-h-32 lg:max-h-none overflow-y-auto">
                      {attachments.map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            {getFileIcon(attachment.originalName)}
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-gray-900 text-sm truncate">{attachment.originalName}</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{formatFileSize(attachment.fileSize)}</span>
                                <span>•</span>
                                <span>Por: {attachment.uploadedBy.name}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleDownload(attachment)}
                              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                              title="Download"
                            >
                              <Download className="h-3 w-3" />
                            </button>
                            
                            {canDeleteAttachment(attachment) && (
                              <button 
                                onClick={() => handleDeleteAttachment(attachment)}
                                disabled={isDeletingAttachment === attachment.id}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Excluir anexo"
                              >
                                {isDeletingAttachment === attachment.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3" />
                                )}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500 bg-gray-50 rounded-lg">
                      <Paperclip className="h-6 w-6 mx-auto mb-2 text-gray-300" />
                      <p className="font-medium text-sm">Nenhum anexo</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* CHAT DE COMENTÁRIOS COM DELETE */}
            <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col bg-gray-50 flex-1 lg:flex-none min-h-[50vh] lg:min-h-0">
              
              <div className="p-3 border-b border-gray-200 bg-white">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Comentários ({comments.length})
                  {isLoadingComments && <Loader2 className="h-4 w-4 animate-spin" />}
                </h3>
                <p className="text-xs text-gray-500">Conversa da equipe</p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {isLoadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Carregando comentários...</span>
                  </div>
                ) : comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white rounded-lg p-3 shadow-sm group hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="font-medium text-gray-900 text-sm truncate">{comment.author.name}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
                            comment.author.role === 'MANAGER' 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {comment.author.role === 'MANAGER' ? 'Gerente' : 'Funcionário'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {new Date(comment.createdAt).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm leading-relaxed">{comment.message}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium text-sm">Nenhum comentário ainda</p>
                    <p className="text-xs">Seja o primeiro a comentar!</p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-200 bg-white">
                <form onSubmit={handleSubmitComment} className="space-y-2">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Escreva um comentário..."
                    className="w-full p-3 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    rows={3}
                  />
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmittingComment}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    {isSubmittingComment ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Enviar Comentário
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default TaskDetailsModal