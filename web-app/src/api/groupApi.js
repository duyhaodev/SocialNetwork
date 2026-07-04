import axiosClient from "./axiosClient";

const groupApi = {
  createGroup(payload) {
    return axiosClient.post("/group/", payload);
  },

  updateGroup(groupId, payload) {
    return axiosClient.put(`/group/${groupId}`, payload);
  },

  getGroupRules(groupId) {
    return axiosClient.get(`/group/${groupId}/rules`);
  },

  updateGroupRules(groupId, payload) {
    return axiosClient.put(`/group/${groupId}/rules`, payload);
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
  },

  banMember(groupId, userId) {
    return axiosClient.post(`/group/${groupId}/members/${userId}/ban`);
  },

  unbanMember(groupId, userId) {
    return axiosClient.post(`/group/${groupId}/members/${userId}/unban`);
  },

  getBannedMembers(groupId) {
    return axiosClient.get(`/group/${groupId}/members/banned`);
  },

  createReport(groupId, payload) {
    return axiosClient.post(`/group/${groupId}/reports`, payload);
  },

  getPendingReports(groupId) {
    return axiosClient.get(`/group/${groupId}/reports/pending`);
  },

  updateReportStatus(groupId, reportId, status, notifyUserId = null, reason = null) {
    const params = { status };
    if (notifyUserId) params.notifyUserId = notifyUserId;
    if (reason) params.reason = reason;
    return axiosClient.put(`/group/${groupId}/reports/${reportId}/status`, null, { params });
  }
};

export default groupApi;
