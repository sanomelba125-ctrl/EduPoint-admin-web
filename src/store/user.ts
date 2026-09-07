import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface UserInfo {
  id: number
  username: string
  nickname: string
  avatar?: string
}

export const useUserStore = defineStore('user', () => {
  const token = ref<string>(localStorage.getItem('admin_token') || '')
  const userInfo = ref<UserInfo | null>(null)
  const isCollapse = ref<boolean>(false)

  const setToken = (newToken: string) => {
    token.value = newToken
    localStorage.setItem('admin_token', newToken)
  }

  const setUserInfo = (info: UserInfo) => {
    userInfo.value = info
  }

  const toggleCollapse = () => {
    isCollapse.value = !isCollapse.value
  }

  const logout = () => {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('admin_token')
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
