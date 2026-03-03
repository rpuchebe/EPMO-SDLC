import { createServiceClient } from './src/utils/supabase/service';
async function test() {
    const supabase = createServiceClient();
    const { data: bwis, error } = await supabase
        .from('jira_issues')
        .select(`
            jira_issue_id,
            h:bwi_health_latest(
                missing_critical_dates_flag,
                closed_open_children_flag,
                status_inconsistency_flag,
                no_child_issues_flag,
                children_activity_mismatch_flag,
                behind_schedule_flag
            )
        `)
        .in('issue_type', ['Business Epic', 'Enhancement', 'New Feature', 'Maintenance (RTB)', 'Issue', 'Epic'])
        .limit(5);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Returned sample items:");
        console.dir(bwis, { depth: null });

        console.log("\nInspecting first item's h property type:")
        if (bwis && bwis.length > 0) {
            console.log("h:", bwis[0].h, "Is Array?", Array.isArray(bwis[0].h));
        }
    }
}
test();
