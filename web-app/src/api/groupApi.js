import axiosClient from "./axiosClient";

const groupApi = {
  createGroup(payload) {
    return axiosClient.post("/group/", payload);
  },

  getGroupDetails(groupId) {
    return axiosClient.get(`/group/${groupId}`);
  },

  disbandGroup(groupId) {
    return axiosClient.delete(`/group/${groupId}`);
  },

  joinGroup(groupId) {
    return axiosClient.post(`/group/${groupId}/join`);
  },

  leaveGroup(groupId) {
    return axiosClient.delete(`/group/${groupId}/leave`);
  },

  approveMember(groupId, userId) {
    return axiosClient.put(`/group/${groupId}/members/${userId}/approve`);
  },

  getPendingMembers(groupId) {
    return axiosClient.get(`/group/${groupId}/members/pending`);
  },

  getActiveMembers(groupId) {
    return axiosClient.get(`/group/${groupId}/members/active`);
  },

  kickMember(groupId, userId) {
    return axiosClient.delete(`/group/${groupId}/members/${userId}/kick`);
  },

  promoteToModerator(groupId, userId) {
    return axiosClient.put(`/group/${groupId}/members/${userId}/promote`);
  },

  getMyGroups() {
    return axiosClient.get("/group/my-groups"); // Chú ý: Backend chưa có API này, tôi cần bổ sung ở phía backend!
  },

  getAllGroups() {
      return axiosClient.get("/group/"); // Thêm trailing slash để tránh Spring Boot redirect 302
  }
};

export default groupApi;
