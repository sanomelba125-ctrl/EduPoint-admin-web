import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
  role?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('admin_token') || '')
  
  const savedUserInfo = localStorage.getItem('admin_user_info')
  const userInfo = ref<UserInfo | null>(savedUserInfo ? JSON.parse(savedUserInfo) : null)
  const isCollapse = ref<boolean>(false)

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('admin_token', newToken)
  }

  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
    localStorage.setItem('admin_user_info', JSON.stringify(info))
  }

  const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user_info')
  }

  return {
    token,
    userInfo,
    isCollapse,
    setToken,
    setUserInfo,
    toggleCollapse,
    logout
  }
})
