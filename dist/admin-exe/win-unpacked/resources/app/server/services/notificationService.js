const { supabase, toCamelCase, toSnakeCase } = require('../utils/supabaseHelper');

class NotificationService {
  /**
   * General notification dispatcher
   */
  static async send({ title, message, category = 'General', targetType = 'All Students', targetId = null, targetModel = null, priority = 'Normal', sender = 'Sports Incharge' }) {
    try {
      const payload = {
        title,
        message,
        category,
        target_type: targetType,
        target_id: targetId || null,
        target_model: targetModel || null,
        priority,
        sender
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
