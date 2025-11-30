import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('tasks')
    return saved ? JSON.parse(saved) : []
  })
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('projects')
    return saved ? JSON.parse(saved) : ['インボックス', '仕事', 'プライベート']
  })
  const [memos, setMemos] = useState(() => {
    const saved = localStorage.getItem('memos')
    return saved ? JSON.parse(saved) : []
  })
  const [inputValue, setInputValue] = useState('')
  const [inputDescription, setInputDescription] = useState('')
  const [selectedProject, setSelectedProject] = useState('インボックス')
  const [selectedPriority, setSelectedPriority] = useState('中')
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [selectedRepeat, setSelectedRepeat] = useState('none')
  const [filterProject, setFilterProject] = useState('すべて')
  const [newProject, setNewProject] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('none')
  const [hideDone, setHideDone] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingText, setEditingText] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingDueDate, setEditingDueDate] = useState('')
  const [editingStartTime, setEditingStartTime] = useState('')
  const [editingRepeat, setEditingRepeat] = useState('none')
  const [subTaskInput, setSubTaskInput] = useState({})
  const [expandedTask, setExpandedTask] = useState(null)
  
  const [viewMode, setViewMode] = useState('list')
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const [memoTitle, setMemoTitle] = useState('')
  const [memoContent, setMemoContent] = useState('')
  const [memoColor, setMemoColor] = useState('#fef3c7')
  const [memoLinkTask, setMemoLinkTask] = useState('')
  const [editingMemoId, setEditingMemoId] = useState(null)
  
  const [notificationPermission, setNotificationPermission] = useState('default')
  const [notifiedTasks, setNotifiedTasks] = useState(() => {
    const saved = localStorage.getItem('notifiedTasks')
    return saved ? JSON.parse(saved) : []
  })
  
  const editingRef = useRef(null)

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('notifiedTasks', JSON.stringify(notifiedTasks))
  }, [notifiedTasks])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      if (permission === 'granted') {
        new Notification('通知が有効になりました', {
          body: 'タスクの期限・開始時間をお知らせします',
          icon: '/todo-app/icon-192.png'
        })
      }
    }
  }

  const sendNotification = (title, body, taskId) => {
    if (notificationPermission === 'granted' && !notifiedTasks.includes(taskId)) {
      new Notification(title, {
        body: body,
        icon: '/todo-app/icon-192.png',
        tag: `task-${taskId}`
      })
      setNotifiedTasks(prev => [...prev, taskId])
    }
  }

  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date()
      const currentDateStr = formatDate(now)
      const currentTimeStr = now.toTimeString().slice(0, 5)
      
      tasks.forEach(task => {
        if (task.done) return
        
        if (task.dueDate === currentDateStr && task.startTime) {
          if (task.startTime === currentTimeStr) {
            sendNotification(
              '⏰ タスク開始時間',
              task.text,
              `start-${task.id}-${currentDateStr}`
            )
          }
          const startDate = new Date(`${task.dueDate}T${task.startTime}`)
          const diff = (startDate - now) / 1000 / 60
          if (diff > 14 && diff <= 15) {
            sendNotification(
              '⏰ 15分後に開始',
              task.text,
              `start15-${task.id}-${currentDateStr}`
            )
          }
        }
        
        if (task.dueDate === currentDateStr && currentTimeStr === '09:00') {
          sendNotification(
            '📅 今日が期限です',
            task.text,
            `due-${task.id}-${currentDateStr}`
          )
        }
      })
    }

    const interval = setInterval(checkNotifications, 60000)
    checkNotifications()
    return () => clearInterval(interval)
  }, [tasks, notificationPermission, notifiedTasks])

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks))
  }, [tasks])

  useEffect(() => {
    localStorage.setItem('projects', JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    localStorage.setItem('memos', JSON.stringify(memos))
  }, [memos])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (editingId && editingRef.current && !editingRef.current.contains(event.target)) {
        saveEditing()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [editingId, editingText, editingDescription, editingDueDate, editingStartTime, editingRepeat])

  const getNextRepeatDate = (currentDate, repeatType) => {
    const date = new Date(currentDate)
    switch (repeatType) {
      case 'daily':
        date.setDate(date.getDate() + 1)
        break
      case 'weekly':
        date.setDate(date.getDate() + 7)
        break
      case 'monthly':
        date.setMonth(date.getMonth() + 1)
        break
      case 'weekdays':
        do {
          date.setDate(date.getDate() + 1)
        } while (date.getDay() === 0 || date.getDay() === 6)
        break
      default:
        return null
    }
    return formatDate(date)
  }

  const addTask = () => {
    if (inputValue.trim() === '') return
    const newTask = {
      id: Date.now(),
      text: inputValue,
      description: inputDescription,
      done: false,
      project: selectedProject,
      priority: selectedPriority,
      dueDate: selectedDate,
      startTime: selectedTime,
      repeat: selectedRepeat,
      subTasks: [],
      createdAt: new Date().toISOString()
    }
    setTasks([...tasks, newTask])
    setInputValue('')
    setInputDescription('')
    setSelectedDate('')
    setSelectedTime('')
    setSelectedRepeat('none')
  }

  const deleteTask = (id) => {
    if (window.confirm('このタスクを削除しますか？')) {
      setTasks(tasks.filter(task => task.id !== id))
      setMemos(memos.map(memo => memo.linkedTaskId === id ? { ...memo, linkedTaskId: null } : memo))
    }
  }

  const toggleTask = (id) => {
    setTasks(tasks.map(task => {
      if (task.id === id) {
        const newDone = !task.done
        
        if (newDone && task.repeat && task.repeat !== 'none' && task.dueDate) {
          const nextDate = getNextRepeatDate(task.dueDate, task.repeat)
          if (nextDate) {
            const newTask = {
              ...task,
              id: Date.now(),
              done: false,
              dueDate: nextDate,
              createdAt: new Date().toISOString()
            }
            setTimeout(() => {
              setTasks(prev => [...prev, newTask])
            }, 100)
          }
        }
        
        return { ...task, done: newDone }
      }
      return task
    }))
  }

  const startEditing = (task) => {
    if (editingId && editingId !== task.id) {
      saveEditingDirect()
    }
    setEditingId(task.id)
    setEditingText(task.text)
    setEditingDescription(task.description || '')
    setEditingDueDate(task.dueDate || '')
    setEditingStartTime(task.startTime || '')
    setEditingRepeat(task.repeat || 'none')
    setExpandedTask(task.id)
  }

  const saveEditing = () => {
    if (editingId && editingText.trim() !== '') {
      setTasks(tasks.map(task =>
        task.id === editingId 
          ? { 
              ...task, 
              text: editingText, 
              description: editingDescription, 
              dueDate: editingDueDate,
              startTime: editingStartTime,
              repeat: editingRepeat
            } 
          : task
      ))
    }
    setEditingId(null)
    setEditingText('')
    setEditingDescription('')
    setEditingDueDate('')
    setEditingStartTime('')
    setEditingRepeat('none')
  }

  const saveEditingDirect = () => {
    if (editingId && editingText.trim() !== '') {
      setTasks(prev => prev.map(task =>
        task.id === editingId 
          ? { 
              ...task, 
              text: editingText, 
              description: editingDescription, 
              dueDate: editingDueDate,
              startTime: editingStartTime,
              repeat: editingRepeat
            } 
          : task
      ))
    }
    setEditingId(null)
    setEditingText('')
    setEditingDescription('')
    setEditingDueDate('')
    setEditingStartTime('')
    setEditingRepeat('none')
  }

  const addSubTask = (taskId) => {
    const subText = subTaskInput[taskId]
    if (!subText || subText.trim() === '') return
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subTasks: [...task.subTasks, { id: Date.now(), text: subText, done: false }]
        }
      }
      return task
    }))
    setSubTaskInput({ ...subTaskInput, [taskId]: '' })
  }

  const toggleSubTask = (taskId, subTaskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subTasks: task.subTasks.map(sub =>
            sub.id === subTaskId ? { ...sub, done: !sub.done } : sub
          )
        }
      }
      return task
    }))
  }

  const deleteSubTask = (taskId, subTaskId) => {
    setTasks(tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          subTasks: task.subTasks.filter(sub => sub.id !== subTaskId)
        }
      }
      return task
    }))
  }

  const addProject = () => {
    if (newProject.trim() === '' || projects.includes(newProject)) return
    setProjects([...projects, newProject])
    setNewProject('')
  }

  const deleteProject = (projectName) => {
    if (projectName === 'インボックス') {
      alert('インボックスは削除できません')
      return
    }
    if (window.confirm(`「${projectName}」を削除しますか？`)) {
      setTasks(tasks.map(task =>
        task.project === projectName ? { ...task, project: 'インボックス' } : task
      ))
      setProjects(projects.filter(p => p !== projectName))
      if (filterProject === projectName) setFilterProject('すべて')
      if (selectedProject === projectName) setSelectedProject('インボックス')
    }
  }

  const addMemo = () => {
    const newMemo = {
      id: Date.now(),
      title: '',
      content: '',
      color: memoColor,
      linkedTaskId: memoLinkTask ? parseInt(memoLinkTask) : null,
      minimized: false,
      createdAt: new Date().toISOString()
    }
    setMemos([...memos, newMemo])
    setMemoLinkTask('')
  }

  const deleteMemo = (id) => {
    if (window.confirm('このメモを削除しますか？')) {
      setMemos(memos.filter(memo => memo.id !== id))
    }
  }

  const getLinkedMemos = (taskId) => {
    return memos.filter(memo => memo.linkedTaskId === taskId)
  }

  const getLinkedTask = (taskId) => {
    return tasks.find(task => task.id === taskId)
  }

  const formatDate = (date) => date.toISOString().split('T')[0]
  
  const formatDisplayDate = (date) => {
    return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })
  }

  const getRepeatLabel = (repeat) => {
    switch (repeat) {
      case 'daily': return '毎日'
      case 'weekly': return '毎週'
      case 'monthly': return '毎月'
      case 'weekdays': return '平日'
      default: return ''
    }
  }

  const getWeekDates = (date) => {
    const week = []
    const start = new Date(date)
    start.setDate(start.getDate() - start.getDay())
    for (let i = 0; i < 7; i++) {
      const day = new Date(start)
      day.setDate(start.getDate() + i)
      week.push(day)
    }
    return week
  }

  const getMonthDates = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const dates = []
    const startPadding = firstDay.getDay()
    for (let i = startPadding - 1; i >= 0; i--) {
      dates.push({ date: new Date(year, month, -i), isCurrentMonth: false })
    }
    for (let i = 1; i <= lastDay.getDate(); i++) {
      dates.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    const endPadding = 42 - dates.length
    for (let i = 1; i <= endPadding; i++) {
      dates.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }
    return dates
  }

  const getTasksForDate = (date) => {
    const dateStr = formatDate(date)
    return tasks.filter(task => task.dueDate === dateStr)
  }

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate)
    if (viewMode === 'day') newDate.setDate(newDate.getDate() + direction)
    else if (viewMode === 'week') newDate.setDate(newDate.getDate() + (direction * 7))
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + direction)
    setCurrentDate(newDate)
  }

  const goToToday = () => setCurrentDate(new Date())

  let filteredTasks = tasks.filter(task => {
    if (hideDone && task.done) return false
    if (searchQuery && !task.text.toLowerCase().includes(searchQuery.toLowerCase())) return false
    if (filterProject === 'すべて') return true
    if (filterProject === '今日') return task.dueDate === formatDate(new Date())
    if (filterProject === '期限切れ') return task.dueDate && task.dueDate < formatDate(new Date()) && !task.done
    return task.project === filterProject
  })

  filteredTasks = [...filteredTasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return 0
  })

  if (sortBy === 'priority') {
    const priorityOrder = { '高': 0, '中': 1, '低': 2 }
    filteredTasks = [...filteredTasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return priorityOrder[a.priority] - priorityOrder[b.priority]
    })
  } else if (sortBy === 'dueDate') {
    filteredTasks = [...filteredTasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      if (!a.dueDate) return 1
      if (!b.dueDate) return -1
      return a.dueDate.localeCompare(b.dueDate)
    })
  }

  const isOverdue = (dueDate) => dueDate && dueDate < formatDate(new Date())
  const isToday = (date) => formatDate(date) === formatDate(new Date())
  const getPriorityColor = (priority) => {
    switch (priority) {
      case '高': return '#ef4444'
      case '中': return '#f59e0b'
      case '低': return '#10b981'
      default: return '#6b7280'
    }
  }

  const getSubTaskProgress = (task) => {
    if (!task.subTasks || task.subTasks.length === 0) return null
    const done = task.subTasks.filter(s => s.done).length
    const total = task.subTasks.length
    return { done, total }
  }

  const totalTasks = tasks.length
  const doneTasks = tasks.filter(t => t.done).length
  const overdueTasks = tasks.filter(t => isOverdue(t.dueDate) && !t.done).length

  const memoColors = [
    { name: '黄色', value: '#fef3c7' },
    { name: 'ピンク', value: '#fce7f3' },
    { name: '青', value: '#dbeafe' },
    { name: '緑', value: '#d1fae5' },
    { name: '紫', value: '#ede9fe' },
    { name: 'オレンジ', value: '#ffedd5' },
  ]

  const TaskItem = ({ task, compact = false }) => (
    <div className={`task-item ${task.done ? 'done' : ''} ${isOverdue(task.dueDate) && !task.done ? 'overdue' : ''} ${compact ? 'compact' : ''}`}>
      <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} />
      <span className="priority-dot" style={{ background: getPriorityColor(task.priority) }} />
      <span className="task-text">{task.text}</span>
      {task.startTime && <span className="task-time">{task.startTime}</span>}
      {task.repeat && task.repeat !== 'none' && <span className="repeat-icon">🔁</span>}
      {!compact && <button className="delete-btn" onClick={() => deleteTask(task.id)}>🗑️</button>}
    </div>
  )

  return (
    <div className="app">
      <header className="app-header">
        <h1>📝 Todoリスト</h1>
        <div className="header-actions">
          {notificationPermission !== 'granted' && (
            <button className="notification-btn" onClick={requestNotificationPermission}>
              🔔 通知を有効にする
            </button>
          )}
          {notificationPermission === 'granted' && (
            <span className="notification-status">🔔 通知ON</span>
          )}
        </div>
        <div className="view-switcher">
          <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}>リスト</button>
          <button className={viewMode === 'memo' ? 'active' : ''} onClick={() => setViewMode('memo')}>メモ</button>
          <button className={viewMode === 'day' ? 'active' : ''} onClick={() => setViewMode('day')}>日</button>
          <button className={viewMode === 'week' ? 'active' : ''} onClick={() => setViewMode('week')}>週</button>
          <button className={viewMode === 'month' ? 'active' : ''} onClick={() => setViewMode('month')}>月</button>
        </div>
      </header>

      {viewMode === 'memo' && (
        <div className="memo-view">
          <div className="memo-toolbar">
            <div className="color-picker">
              <span>色：</span>
              {memoColors.map(c => (
                <button
                  key={c.value}
                  className={`color-btn ${memoColor === c.value ? 'active' : ''}`}
                  style={{ background: c.value }}
                  onClick={() => setMemoColor(c.value)}
                  title={c.name}
                />
              ))}
            </div>
            <div className="task-link">
              <span>タスク：</span>
              <select value={memoLinkTask} onChange={(e) => setMemoLinkTask(e.target.value)}>
                <option value="">紐付けなし</option>
                {tasks.filter(t => !t.done).map(task => (
                  <option key={task.id} value={task.id}>{task.text}</option>
                ))}
              </select>
            </div>
            <button onClick={addMemo} className="add-sticky-btn">+ 新しい付箋</button>
          </div>

          <div className="sticky-container">
            {memos.map(memo => {
              const linkedTask = memo.linkedTaskId ? getLinkedTask(memo.linkedTaskId) : null
              const colorClass = memoColors.find(c => c.value === memo.color)?.name || 'yellow'
              const colorMap = {
                '黄色': 'yellow',
                'ピンク': 'pink',
                '青': 'blue',
                '緑': 'green',
                '紫': 'purple',
                'オレンジ': 'orange'
              }
              return (
                <div 
                  key={memo.id} 
                  className={`sticky-note ${colorMap[colorClass] || 'yellow'} ${memo.minimized ? 'minimized' : ''}`}
                >
                  <div className="sticky-header">
                    <input
                      type="text"
                      className="sticky-title"
                      value={memo.title}
                      onChange={(e) => {
                        setMemos(memos.map(m => 
                          m.id === memo.id ? { ...m, title: e.target.value } : m
                        ))
                      }}
                      placeholder="タイトル..."
                    />
                    <div className="sticky-actions">
                      <button 
                        onClick={() => {
                          setMemos(memos.map(m => 
                            m.id === memo.id ? { ...m, minimized: !m.minimized } : m
                          ))
                        }}
                        title={memo.minimized ? '展開' : '折りたたみ'}
                      >
                        {memo.minimized ? '＋' : '－'}
                      </button>
                      <button onClick={() => deleteMemo(memo.id)} title="削除">×</button>
                    </div>
                  </div>
                  <div className="sticky-content">
                    <textarea
                      className="sticky-textarea"
                      value={memo.content}
                      onChange={(e) => {
                        setMemos(memos.map(m => 
                          m.id === memo.id ? { ...m, content: e.target.value } : m
                        ))
                      }}
                      placeholder="メモを入力..."
                    />
                  </div>
                  {linkedTask && (
                    <div className="sticky-footer">
                      <span>🔗</span>
                      <span className="sticky-link">{linkedTask.text}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {memos.length === 0 && (
            <p className="empty">「+ 新しい付箋」をクリックしてメモを追加</p>
          )}
        </div>
      )}

      {(viewMode === 'day' || viewMode === 'week' || viewMode === 'month') && (
        <div className="calendar-nav">
          <button onClick={() => navigateDate(-1)}>◀</button>
          <span className="current-date">
            {viewMode === 'day' && formatDisplayDate(currentDate)}
            {viewMode === 'week' && `${formatDisplayDate(getWeekDates(currentDate)[0])} 〜`}
            {viewMode === 'month' && currentDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
          </span>
          <button onClick={() => navigateDate(1)}>▶</button>
          <button className="today-btn" onClick={goToToday}>今日</button>
        </div>
      )}

      {viewMode === 'day' && (
        <div className="day-view">
          {getTasksForDate(currentDate).length === 0 ? (
            <p className="no-tasks">この日のタスクはありません</p>
          ) : (
            getTasksForDate(currentDate).map(task => <TaskItem key={task.id} task={task} />)
          )}
        </div>
      )}

      {viewMode === 'week' && (
        <div className="week-view">
          {getWeekDates(currentDate).map(date => (
            <div key={formatDate(date)} className={`week-day ${isToday(date) ? 'today' : ''}`}>
              <div className="week-day-header">
                <span className="day-name">{date.toLocaleDateString('ja-JP', { weekday: 'short' })}</span>
                <span className="day-number">{date.getDate()}</span>
              </div>
              <div className="week-day-tasks">
                {getTasksForDate(date).map(task => <TaskItem key={task.id} task={task} compact />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'month' && (
        <div className="month-view">
          <div className="month-header">
            {['日', '月', '火', '水', '木', '金', '土'].map(day => (
              <div key={day} className="month-day-name">{day}</div>
            ))}
          </div>
          <div className="month-grid">
            {getMonthDates(currentDate).map(({ date, isCurrentMonth }) => (
              <div key={formatDate(date)} className={`month-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday(date) ? 'today' : ''}`}>
                <div className="month-day-number">{date.getDate()}</div>
                <div className="month-day-tasks">
                  {getTasksForDate(date).slice(0, 3).map(task => (
                    <div key={task.id} className={`month-task ${task.done ? 'done' : ''}`} style={{ borderLeftColor: getPriorityColor(task.priority) }}>
                      {task.startTime && <span className="month-task-time">{task.startTime}</span>}
                      {task.text}
                    </div>
                  ))}
                  {getTasksForDate(date).length > 3 && <div className="more-tasks">+{getTasksForDate(date).length - 3}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {viewMode === 'list' && (
        <div className="list-view">
          <div className="input-section">
            <div className="input-row">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                placeholder="タスクを入力..."
                className="task-input"
              />
              <button onClick={addTask} className="add-btn">追加</button>
            </div>
            <textarea
              value={inputDescription}
              onChange={(e) => setInputDescription(e.target.value)}
              placeholder="詳細を入力（任意）..."
              className="description-input"
            />
            <div className="options-row">
              <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value)}>
                <option value="高">🔴 高</option>
                <option value="中">🟡 中</option>
                <option value="低">🟢 低</option>
              </select>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
              <input 
                type="time" 
                value={selectedTime} 
                onChange={(e) => setSelectedTime(e.target.value)}
                className="time-input"
              />
              <select value={selectedRepeat} onChange={(e) => setSelectedRepeat(e.target.value)} className="repeat-select">
                <option value="none">繰り返しなし</option>
                <option value="daily">毎日</option>
                <option value="weekly">毎週</option>
                <option value="monthly">毎月</option>
                <option value="weekdays">平日のみ</option>
              </select>
            </div>
          </div>

          <div className="controls-section">
            <div className="search-filter-row">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="🔍 検索..."
                className="search-input"
              />
              <select value={filterProject} onChange={(e) => setFilterProject(e.target.value)}>
                <option value="すべて">すべて</option>
                <option value="今日">今日</option>
                <option value="期限切れ">期限切れ</option>
                {projects.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="none">並び替え</option>
                <option value="priority">優先度</option>
                <option value="dueDate">期限</option>
              </select>
              <label className="hide-done">
                <input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} />
                完了非表示
              </label>
            </div>
            <div className="project-row">
              <input
                type="text"
                value={newProject}
                onChange={(e) => setNewProject(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addProject()}
                placeholder="新規プロジェクト..."
                className="project-input"
              />
              <button onClick={addProject} className="project-add-btn">+</button>
              <div className="project-chips">
                {projects.map(p => (
                  <span key={p} className="project-chip">
                    {p}
                    {p !== 'インボックス' && <button onClick={() => deleteProject(p)}>×</button>}
                  </span>
                ))}
              </div>
            </div>
            <div className="stats-row">
              <span>全{totalTasks}件</span>
              <span>完了{doneTasks}件</span>
              {overdueTasks > 0 && <span className="overdue-stat">期限切れ{overdueTasks}件</span>}
            </div>
          </div>

          <ul className="task-list">
            {filteredTasks.map(task => {
              const progress = getSubTaskProgress(task)
              const linkedMemos = getLinkedMemos(task.id)
              return (
                <li key={task.id} className={`task-item-wrapper ${task.done ? 'done' : ''} ${isOverdue(task.dueDate) && !task.done ? 'overdue' : ''}`}>
                  <div 
                    className="task-main" 
                    onClick={() => {
                      if (editingId && editingId !== task.id) saveEditing()
                      setExpandedTask(expandedTask === task.id ? null : task.id)
                    }}
                  >
                    <input type="checkbox" checked={task.done} onChange={(e) => { e.stopPropagation(); toggleTask(task.id) }} />
                    <span className="priority-dot" style={{ background: getPriorityColor(task.priority) }} />
                    <span className="task-text">{task.text}</span>
                    
                    <div className="task-badges">
                      {progress && (
                        <span className={`subtask-badge ${progress.done === progress.total ? 'complete' : ''}`}>
                          📋 {progress.done}/{progress.total}
                        </span>
                      )}
                      {linkedMemos.length > 0 && (
                        <span className="memo-badge">📌 {linkedMemos.length}</span>
                      )}
                      {task.repeat && task.repeat !== 'none' && (
                        <span className="repeat-badge">🔁 {getRepeatLabel(task.repeat)}</span>
                      )}
                      {task.startTime && (
                        <span className="time-badge">⏰ {task.startTime}</span>
                      )}
                      <span className="project-tag">{task.project}</span>
                      {task.dueDate && <span className="due-date">{task.dueDate}</span>}
                    </div>
                    
                    <button className="edit-btn" onClick={(e) => { e.stopPropagation(); startEditing(task) }}>✏️</button>
                    <button className="delete-btn" onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}>🗑️</button>
                    <span className="expand-icon">{expandedTask === task.id ? '▲' : '▼'}</span>
                  </div>

                  {expandedTask === task.id && (
                    <div className="task-details" ref={editingId === task.id ? editingRef : null}>
                      {editingId === task.id ? (
                        <>
                          <input
                            type="text"
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="edit-title"
                            placeholder="タスク名..."
                          />
                          <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            placeholder="詳細を入力..."
                            className="edit-description"
                          />
                          <div className="edit-options">
                            <div className="edit-option">
                              <label>📅 期限：</label>
                              <input
                                type="date"
                                value={editingDueDate}
                                onChange={(e) => setEditingDueDate(e.target.value)}
                                className="edit-date-input"
                              />
                              {editingDueDate && (
                                <button 
                                  type="button"
                                  className="clear-btn"
                                  onClick={() => setEditingDueDate('')}
                                >
                                  クリア
                                </button>
                              )}
                            </div>
                            <div className="edit-option">
                              <label>⏰ 開始時間：</label>
                              <input
                                type="time"
                                value={editingStartTime}
                                onChange={(e) => setEditingStartTime(e.target.value)}
                                className="edit-time-input"
                              />
                              {editingStartTime && (
                                <button 
                                  type="button"
                                  className="clear-btn"
                                  onClick={() => setEditingStartTime('')}
                                >
                                  クリア
                                </button>
                              )}
                            </div>
                            <div className="edit-option">
                              <label>🔁 繰り返し：</label>
                              <select
                                value={editingRepeat}
                                onChange={(e) => setEditingRepeat(e.target.value)}
                                className="edit-repeat-select"
                              >
                                <option value="none">なし</option>
                                <option value="daily">毎日</option>
                                <option value="weekly">毎週</option>
                                <option value="monthly">毎月</option>
                                <option value="weekdays">平日のみ</option>
                              </select>
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="description">{task.description || '詳細なし'}</p>
                          <div className="task-info">
                            {task.startTime && <span>⏰ 開始: {task.startTime}</span>}
                            {task.repeat && task.repeat !== 'none' && <span>🔁 {getRepeatLabel(task.repeat)}</span>}
                          </div>
                        </>
                      )}

                      {linkedMemos.length > 0 && (
                        <div className="linked-memos">
                          <div className="linked-memos-header">📌 関連メモ</div>
                          {linkedMemos.map(memo => (
                            <div key={memo.id} className="linked-memo-card" style={{ background: memo.color }}>
                              <strong>{memo.title || '無題'}</strong>
                              <p>{memo.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="subtasks">
                        <div className="subtasks-header">サブタスク</div>
                        {task.subTasks.map(sub => (
                          <div key={sub.id} className={`subtask ${sub.done ? 'done' : ''}`}>
                            <input type="checkbox" checked={sub.done} onChange={() => toggleSubTask(task.id, sub.id)} />
                            <span>{sub.text}</span>
                            <button onClick={() => deleteSubTask(task.id, sub.id)}>×</button>
                          </div>
                        ))}
                        <div className="subtask-add">
                          <input
                            type="text"
                            value={subTaskInput[task.id] || ''}
                            onChange={(e) => setSubTaskInput({ ...subTaskInput, [task.id]: e.target.value })}
                            onKeyPress={(e) => e.key === 'Enter' && addSubTask(task.id)}
                            placeholder="サブタスクを追加..."
                          />
                          <button onClick={() => addSubTask(task.id)}>+</button>
                        </div>
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>

          {filteredTasks.length === 0 && <p className="empty">タスクがありません</p>}
        </div>
      )}
    </div>
  )
}

export default App
