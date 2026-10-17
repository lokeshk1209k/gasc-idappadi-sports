const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

class NotificationService {
  /**
   * General notification dispatcher
   */
  static async send({ id = null, title, message, category = 'General', type = 'announcement', targetType = 'All Students', targetId = null, targetModel = null, priority = 'Normal', sender = 'Sports Incharge', metadata = null }) {
    try {
      const notifId = id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const payload = {
        id: notifId,
        title,
        message: typeof message === 'object' ? JSON.stringify(message) : message,
        category,
        type,
        target_type: targetType,
        target_audience: targetId || 'all',
        priority,
        sender,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(payload)
        .select()
        .single();

      if (error) {
        console.error('Error sending notification to Supabase:', error.message);
        return null;
      }
      return toCamelCase(data);
    } catch (err) {
      console.error('Error sending notification:', err.message);
      return null;
    }
  }

  /**
   * When CM Trophy announcement is published or updated
   */
  static async notifyCmTrophyPublished(announcement, isUpdate = false) {
    const title = isUpdate 
      ? `📢 CM Trophy Update: ${announcement.title}`
      : `🏆 CM Trophy Announcement: ${announcement.title}`;

    const shortMessage = announcement.shortMessage || 
      (announcement.instructions ? announcement.instructions.slice(0, 160) + '...' : 'New CM Trophy instruction published by Sports Department.');

    const notifPayload = {
      announcementId: announcement.id,
      title: announcement.title,
      shortMessage,
      instructions: announcement.instructions || '',
      officialLink: announcement.officialLink || 'https://tncmtrophy.sdat.in/',
      registrationStartDate: announcement.registrationStartDate || null,
      registrationEndDate: announcement.registrationEndDate || null,
      isImportant: !!announcement.isImportant,
      publishedAt: announcement.publishedAt || new Date().toISOString()
    };

    return await this.send({
      id: `notif_cm_${announcement.id}_${isUpdate ? 'upd_' + Date.now() : 'pub'}`,
      title,
      message: JSON.stringify(notifPayload),
      category: 'cm_trophy',
      type: 'cm_trophy_announcement',
      targetType: 'All Students',
      targetId: 'all',
      priority: announcement.isImportant ? 'High' : 'Normal',
      sender: 'Dr. R. ANITHA (Physical Director)'
    });
  }

  /**
   * When competition application is reviewed
   */
  static async notifyApplicationStatus(studentId, competitionName, status, adminRemarks = '') {
    const isApproved = status === 'Approved';
    return await this.send({
      title: `Competition Application ${status}: ${competitionName}`,
      message: isApproved
        ? `Congratulations! Your registration for "${competitionName}" has been approved by Sports Incharge. Check the team roster and practice schedule.`
        : `Your registration for "${competitionName}" was not approved. Remarks: ${adminRemarks || 'Contact Sports Dept.'}`,
      category: 'Competition',
      targetType: 'Specific Student',
      targetId: studentId,
      targetModel: 'User',
      priority: isApproved ? 'High' : 'Normal'
    });
  }

  /**
   * When student is added to a college team
   */
  static async notifyTeamSelection(studentId, teamName, role = 'Player') {
    return await this.send({
      title: `Selected for Team: ${teamName}`,
      message: `You have been selected as ${role} for ${teamName}! Wear your college jersey with pride and attend mandatory practice sessions.`,
      category: 'Team Selection',
      targetType: 'Specific Student',
      targetId: studentId,
      targetModel: 'User',
      priority: 'High'
    });
  }

  /**
   * When equipment is issued to a student
   */
  static async notifyEquipmentIssued(studentId, equipmentName, quantity, returnDate) {
    const formattedDate = new Date(returnDate).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return await this.send({
      title: `Equipment Issued: ${equipmentName} (${quantity})`,
      message: `You have been issued ${quantity} unit(s) of ${equipmentName}. Please return the item in good condition by ${formattedDate}.`,
      category: 'Equipment',
      targetType: 'Specific Student',
      targetId: studentId,
      targetModel: 'User',
      priority: 'Normal'
    });
  }

  /**
   * Alert for low equipment stock
   */
  static async notifyLowStock(equipmentName, available, minimum) {
    return await this.send({
      title: `⚠️ LOW STOCK ALERT: ${equipmentName}`,
      message: `${equipmentName} inventory is low! Available stock is now ${available}, which is at or below the minimum reserve level of ${minimum}. Please initiate purchase/replenishment.`,
      category: 'Equipment',
      targetType: 'All Students',
      priority: 'Urgent',
      sender: 'Inventory Monitor System'
    });
  }

  /**
   * New practice session scheduled
   */
  static async notifyPracticeScheduled(sportName, venue, date, time) {
    const dateStr = new Date(date).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return await this.send({
      title: `Practice Scheduled: ${sportName}`,
      message: `Mandatory training session scheduled for ${sportName} on ${dateStr} from ${time} at ${venue}. All players must report on time in proper sportswear.`,
      category: 'Practice',
      targetType: 'All Students',
      priority: 'Normal'
    });
  }
}

module.exports = NotificationService;
