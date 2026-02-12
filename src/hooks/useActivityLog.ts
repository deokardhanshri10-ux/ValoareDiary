import { supabase } from '../lib/supabase';
import { AuthUser } from '../lib/auth';

export function useActivityLog() {
    const logActivity = async (
        user: AuthUser | null,
        actionType: string,
        tableName: string,
        recordId: string,
        details?: any
    ) => {
        if (!user) return;

        try {
            const { error } = await supabase.from('activity_log').insert({
                organisation_id: user.organisationId,
                user_id: user.id,
                username: user.username, // Or user.fullName if preferred
                action_type: actionType,
                table_name: tableName,
                record_id: recordId,
                new_data: details,
                created_at: new Date().toISOString(),
                // optional: capture ip/user_agent if needed, but might not be available here easily
            });

            if (error) {
                console.error('Error logging activity:', error);
            }
        } catch (err) {
            console.error('Error in logActivity:', err);
        }
    };

    return { logActivity };
}
