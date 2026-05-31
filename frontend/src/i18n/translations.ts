import { useAppStore } from "../store/useAppStore";

export type Lang = "en" | "da";

export interface Translations {
  // Navigation
  nav_dashboard: string;
  nav_groups: string;
  nav_history: string;
  nav_backups: string;
  nav_settings: string;
  header_running_pill: string;
  header_unhealthy_pill: string;
  header_excluded_pill: string;
  lang_switch: string;
  lang_tooltip: string;

  // Summary cards
  card_total: string;
  card_running: string;
  card_offline: string;
  card_excluded: string;
  card_protected: string;
  card_updates: string;
  card_total_tip: string;
  card_running_tip: string;
  card_offline_tip: string;
  card_excluded_tip: string;
  card_protected_tip: string;
  card_updates_tip: string;

  // Filter bar
  filter_all: string;
  filter_running: string;
  filter_offline: string;
  filter_protected: string;
  filter_updates: string;
  filter_all_tip: string;
  filter_running_tip: string;
  filter_offline_tip: string;
  filter_protected_tip: string;
  filter_updates_tip: string;
  search_placeholder: string;

  // Bulk action bar
  bulk_selected: (n: number) => string;
  bulk_start: string;
  bulk_stop: string;
  bulk_restart: string;
  bulk_update: string;

  // Bulk confirm modal
  bulk_confirm_title: (label: string, n: number) => string;
  bulk_confirm_desc: (action: string, n: number) => string;

  // Bulk progress modal
  bulk_progress_header: (label: string) => string;
  bulk_progress_running: string;
  bulk_progress_processing: (done: number, total: number) => string;
  bulk_progress_please_wait: string;
  bulk_progress_result: (ok: number, err: number) => string;
  bulk_progress_close: string;

  // Loading
  loading_containers: string;
  loading: string;
  loading_events: string;

  // Table columns
  col_name_badges: string;
  col_status: string;
  col_image: string;
  col_cpu: string;
  col_ram: string;
  col_network: string;
  col_rxtx: string;
  col_uptime: string;
  col_actions: string;
  col_protected: string;
  col_excluded: string;

  // Actions
  action_start: string;
  action_stop: string;
  action_restart: string;
  action_update: string;
  action_rollback: string;

  // Status labels
  status_running: string;
  status_offline: string;
  status_powered_off: string;
  status_paused: string;
  status_restarting: string;
  status_created: string;

  // Groups in table
  ungrouped: string;
  containers_count: (n: number) => string;

  // History page
  history_title: string;
  history_desc: (n: number) => string;
  history_col_time: string;
  history_col_container: string;
  history_col_event: string;
  history_col_status: string;
  history_col_snapshot: string;
  history_no_events: string;
  history_snapshot_saved: string;

  // Backups page
  backups_title: string;
  backups_desc: (n: number) => string;
  backups_col_time: string;
  backups_col_container: string;
  backups_col_trigger: string;
  backups_col_file: string;
  backups_no_backups: string;
  backups_db_only: string;

  // Settings page
  settings_title: string;
  settings_desc: string;
  settings_overrides_header: string;
  settings_no_overrides: string;
  settings_reinclude: string;
  settings_reinclude_tip: string;
  settings_delete_tip: string;
  settings_badge_protected: string;
  settings_badge_excluded: string;

  // Toggle button titles (in table columns)
  toggle_protect: string;
  toggle_unprotect: string;
  toggle_exclude: string;

  // Groups page
  groups_title: string;
  groups_desc: string;
  groups_create: string;
  groups_name_label: string;
  groups_name_placeholder: string;
  groups_color_label: string;
  groups_empty: string;
  groups_rename_tip: string;
  groups_delete_tip: string;
  groups_delete_confirm: string;
  groups_delete_yes: string;
  groups_delete_no: string;

  // Container Detail
  detail_not_found: string;
  detail_logs: string;
  detail_protected_msg: string;
  detail_badge_update: string;
  detail_section_status: string;
  detail_section_image: string;
  detail_section_network: string;
  detail_section_mounts: string;
  detail_section_settings: string;
  detail_section_events: (n: number) => string;
  detail_section_backups: (n: number) => string;
  detail_no_events: string;
  detail_no_backups: string;
  detail_setting_protected_label: string;
  detail_setting_protected_desc: string;
  detail_setting_excluded_label: string;
  detail_setting_excluded_desc: string;
  detail_via_label: string;
  detail_confirm_title: (actionLabel: string) => string;
  detail_confirm_desc: (actionLabel: string, name: string) => string;
  info_status: string;
  info_health: string;
  info_uptime: string;
  info_restart_policy: string;
  info_hostname: string;
  info_image: string;
  info_image_id: string;
  info_update_status: string;
  info_network: string;
  info_ip: string;
  info_mac: string;
  info_network_mode: string;

  // Chart
  chart_stats_header: string;
  chart_cpu_label: string;
  chart_cpu_tip: string;
  chart_memory_label: string;
  chart_memory_tip: string;
  chart_network_label: string;
  chart_network_tip: string;
  chart_block_label: string;
  chart_block_tip: string;
  chart_live_cpu: string;
  chart_live_ram: string;
  chart_live_rx: string;
  chart_live_tx: string;
}

export const translations: Record<Lang, Translations> = {
  en: {
    nav_dashboard: "Dashboard",
    nav_groups: "Groups",
    nav_history: "History",
    nav_backups: "Backups",
    nav_settings: "Settings",
    header_running_pill: "running",
    header_unhealthy_pill: "unhealthy",
    header_excluded_pill: "excluded",
    lang_switch: "DA",
    lang_tooltip: "Switch to Danish",

    card_total: "Total",
    card_running: "Running",
    card_offline: "Offline",
    card_excluded: "Excluded",
    card_protected: "Protected",
    card_updates: "Updates",
    card_total_tip: "Total — Total number of Docker containers on the server.",
    card_running_tip: "Running — Containers that are currently active and running.",
    card_offline_tip: "Offline — Containers that are stopped or not running. Click to filter.",
    card_excluded_tip: "Excluded — Containers hidden from the dashboard via label or settings.",
    card_protected_tip: "Protected — Containers locked against stop, restart and update.",
    card_updates_tip: "Updates — Containers where a newer Docker image is available.",

    filter_all: "All",
    filter_running: "Running",
    filter_offline: "Offline",
    filter_protected: "Protected",
    filter_updates: "Updates",
    filter_all_tip: "Show all containers",
    filter_running_tip: "Show only running containers",
    filter_offline_tip: "Show only stopped / offline containers",
    filter_protected_tip: "Show only containers protected against changes",
    filter_updates_tip: "Show only containers with available updates",
    search_placeholder: "Search name, IP, image…",

    bulk_selected: (n) => `${n} selected`,
    bulk_start: "Start",
    bulk_stop: "Stop",
    bulk_restart: "Restart",
    bulk_update: "Update",
    bulk_confirm_title: (label, n) => `${label} ${n} container${n !== 1 ? "s" : ""}?`,
    bulk_confirm_desc: (action, n) =>
      `This will ${action.toLowerCase()} all ${n} selected containers in sequence.${action === "update" ? " Protected containers will be skipped." : ""}`,
    bulk_progress_header: (label) => `Bulk ${label}`,
    bulk_progress_running: "running…",
    bulk_progress_processing: (done, total) => `Processing… ${done}/${total}`,
    bulk_progress_please_wait: "Please wait",
    bulk_progress_result: (ok, err) => `${ok} ok${err > 0 ? `, ${err} failed` : ""}`,
    bulk_progress_close: "Close",

    loading_containers: "Loading containers…",
    loading: "Loading…",
    loading_events: "Loading events…",

    col_name_badges: "Name / Badges",
    col_status: "Status",
    col_image: "Image",
    col_cpu: "CPU",
    col_ram: "RAM",
    col_network: "Network / IP / MAC",
    col_rxtx: "RX / TX",
    col_uptime: "Uptime",
    col_actions: "Actions",
    col_protected: "Protected",
    col_excluded: "Excluded",

    action_start: "Start",
    action_stop: "Stop",
    action_restart: "Restart",
    action_update: "Update",
    action_rollback: "Rollback",

    status_running: "running",
    status_offline: "offline",
    status_powered_off: "powered off",
    status_paused: "paused",
    status_restarting: "restarting",
    status_created: "created",

    ungrouped: "Ungrouped",
    containers_count: (n) => `${n} container${n !== 1 ? "s" : ""}`,

    history_title: "Event History",
    history_desc: (n) => `All container lifecycle events — recorded from Docker event stream. ${n} events total.`,
    history_col_time: "Time",
    history_col_container: "Container",
    history_col_event: "Event",
    history_col_status: "Status",
    history_col_snapshot: "Snapshot",
    history_no_events: "No events recorded yet",
    history_snapshot_saved: "✓ saved",

    backups_title: "Backups",
    backups_desc: (n) => `Container inspect JSON snapshots saved before each update or rollback. ${n} backups total.`,
    backups_col_time: "Time",
    backups_col_container: "Container",
    backups_col_trigger: "Trigger",
    backups_col_file: "File",
    backups_no_backups: "No backups yet. Backups are created automatically before updates and rollbacks.",
    backups_db_only: "DB only",

    settings_title: "Dashboard Settings",
    settings_desc: "Per-container overrides set via the dashboard. These take precedence over Docker labels.",
    settings_overrides_header: "Container Overrides",
    settings_no_overrides: "No overrides set. Open a container's detail page to configure protected or excluded settings.",
    settings_reinclude: "Re-include",
    settings_reinclude_tip: "Re-include in dashboard",
    settings_delete_tip: "Remove all overrides for this container",
    settings_badge_protected: "protected",
    settings_badge_excluded: "excluded",

    toggle_protect: "Protect",
    toggle_unprotect: "Unprotect",
    toggle_exclude: "Exclude",

    groups_title: "Groups",
    groups_desc: "Organise containers into folders. A container can only belong to one group.",
    groups_create: "Create Group",
    groups_name_label: "Group name",
    groups_name_placeholder: "e.g. sharedrive",
    groups_color_label: "Color",
    groups_empty: "No groups yet. Create one above.",
    groups_rename_tip: "Rename",
    groups_delete_tip: "Delete group",
    groups_delete_confirm: "Delete?",
    groups_delete_yes: "Yes",
    groups_delete_no: "No",

    detail_not_found: "Container not found.",
    detail_logs: "Logs",
    detail_protected_msg: "Protected — actions disabled",
    detail_badge_update: "update available",
    detail_section_status: "Status",
    detail_section_image: "Image",
    detail_section_network: "Network",
    detail_section_mounts: "Mounts",
    detail_section_settings: "Dashboard Settings",
    detail_section_events: (n) => `Events (${n})`,
    detail_section_backups: (n) => `Backups (${n})`,
    detail_no_events: "No events yet",
    detail_no_backups: "No backups yet",
    detail_setting_protected_label: "Protected",
    detail_setting_protected_desc: "Disables start / stop / restart / update",
    detail_setting_excluded_label: "Excluded",
    detail_setting_excluded_desc: "Hides container from the dashboard",
    detail_via_label: "(via label)",
    detail_confirm_title: (label) => `${label} container?`,
    detail_confirm_desc: (label, name) => `Are you sure you want to ${label.toLowerCase()} "${name}"?`,
    info_status: "Status",
    info_health: "Health",
    info_uptime: "Uptime",
    info_restart_policy: "Restart policy",
    info_hostname: "Hostname",
    info_image: "Image",
    info_image_id: "Image ID",
    info_update_status: "Update status",
    info_network: "Network",
    info_ip: "IP",
    info_mac: "MAC",
    info_network_mode: "Network mode",

    chart_stats_header: "Stats (24h)",
    chart_cpu_label: "cpu",
    chart_cpu_tip: "CPU — Percentage of CPU time the container uses. High CPU may indicate heavy computation or a hung process.",
    chart_memory_label: "memory",
    chart_memory_tip: "Memory — RAM usage in MB. Shows how much memory the container has allocated and is using.",
    chart_network_label: "network",
    chart_network_tip: "Network — Network traffic (RX = received, TX = sent). Useful for seeing bandwidth usage and activity.",
    chart_block_label: "block",
    chart_block_tip: "Block I/O — Disk reads and writes. High block I/O can indicate heavy database activity or file operations.",
    chart_live_cpu: "CPU",
    chart_live_ram: "RAM",
    chart_live_rx: "RX",
    chart_live_tx: "TX",
  },

  da: {
    nav_dashboard: "Dashboard",
    nav_groups: "Grupper",
    nav_history: "Historik",
    nav_backups: "Sikkerhedskopier",
    nav_settings: "Indstillinger",
    header_running_pill: "kørende",
    header_unhealthy_pill: "usunde",
    header_excluded_pill: "ekskluderet",
    lang_switch: "EN",
    lang_tooltip: "Switch to English",

    card_total: "Total",
    card_running: "Kørende",
    card_offline: "Offline",
    card_excluded: "Ekskluderet",
    card_protected: "Beskyttet",
    card_updates: "Opdateringer",
    card_total_tip: "Total — Det samlede antal Docker-containere på serveren.",
    card_running_tip: "Kørende — Containere der kører og er aktive lige nu.",
    card_offline_tip: "Offline — Containere der er stoppet eller ikke kører. Klik for at filtrere.",
    card_excluded_tip: "Ekskluderet — Containere der er skjult fra dashboardet via label eller indstillinger.",
    card_protected_tip: "Beskyttet — Containere der er låst mod stop, genstart og opdatering.",
    card_updates_tip: "Opdateringer — Containere hvor der er et nyere Docker image tilgængeligt.",

    filter_all: "Alle",
    filter_running: "Kørende",
    filter_offline: "Offline",
    filter_protected: "Beskyttet",
    filter_updates: "Opdateringer",
    filter_all_tip: "Vis alle containere",
    filter_running_tip: "Vis kun containere der kører",
    filter_offline_tip: "Vis kun stoppede / offline containere",
    filter_protected_tip: "Vis kun containere der er beskyttet mod ændringer",
    filter_updates_tip: "Vis kun containere med tilgængelige opdateringer",
    search_placeholder: "Søg navn, IP, image…",

    bulk_selected: (n) => `${n} valgt`,
    bulk_start: "Start",
    bulk_stop: "Stop",
    bulk_restart: "Genstart",
    bulk_update: "Opdater",
    bulk_confirm_title: (label, n) => `${label} ${n} container${n !== 1 ? "e" : ""}?`,
    bulk_confirm_desc: (_action, n) =>
      `${n} valgte containere vil blive behandlet i rækkefølge.${_action === "update" ? " Beskyttede containere springes over." : ""}`,
    bulk_progress_header: (label) => `Bulk ${label}`,
    bulk_progress_running: "kører…",
    bulk_progress_processing: (done, total) => `Behandler… ${done}/${total}`,
    bulk_progress_please_wait: "Vent venligst",
    bulk_progress_result: (ok, err) => `${ok} ok${err > 0 ? `, ${err} fejlede` : ""}`,
    bulk_progress_close: "Luk",

    loading_containers: "Indlæser containere…",
    loading: "Indlæser…",
    loading_events: "Indlæser hændelser…",

    col_name_badges: "Navn / Mærker",
    col_status: "Status",
    col_image: "Image",
    col_cpu: "CPU",
    col_ram: "RAM",
    col_network: "Netværk / IP / MAC",
    col_rxtx: "RX / TX",
    col_uptime: "Oppetid",
    col_actions: "Handlinger",
    col_protected: "Beskyttet",
    col_excluded: "Ekskluderet",

    action_start: "Start",
    action_stop: "Stop",
    action_restart: "Genstart",
    action_update: "Opdater",
    action_rollback: "Tilbagerul",

    status_running: "kørende",
    status_offline: "offline",
    status_powered_off: "slukket",
    status_paused: "sat på pause",
    status_restarting: "genstarter",
    status_created: "oprettet",

    ungrouped: "Ikke grupperet",
    containers_count: (n) => `${n} container${n !== 1 ? "e" : ""}`,

    history_title: "Hændelseshistorik",
    history_desc: (n) => `Alle container-livscyklushændelser — optaget fra Docker event stream. ${n} hændelser i alt.`,
    history_col_time: "Tidspunkt",
    history_col_container: "Container",
    history_col_event: "Hændelse",
    history_col_status: "Status",
    history_col_snapshot: "Snapshot",
    history_no_events: "Ingen hændelser registreret endnu",
    history_snapshot_saved: "✓ gemt",

    backups_title: "Sikkerhedskopier",
    backups_desc: (n) => `Container inspect JSON-snapshots gemt før hver opdatering eller tilbagerulning. ${n} sikkerhedskopier i alt.`,
    backups_col_time: "Tidspunkt",
    backups_col_container: "Container",
    backups_col_trigger: "Årsag",
    backups_col_file: "Fil",
    backups_no_backups: "Ingen sikkerhedskopier endnu. Sikkerhedskopier oprettes automatisk før opdateringer og tilbagerulninger.",
    backups_db_only: "Kun DB",

    settings_title: "Dashboard-indstillinger",
    settings_desc: "Per-container tilsidesættelser sat via dashboardet. Disse har forrang over Docker-labels.",
    settings_overrides_header: "Container-tilsidesættelser",
    settings_no_overrides: "Ingen tilsidesættelser sat. Åbn en containers detaljeside for at konfigurere beskyttede eller ekskluderede indstillinger.",
    settings_reinclude: "Geninkluder",
    settings_reinclude_tip: "Geninkluder i dashboard",
    settings_delete_tip: "Fjern alle tilsidesættelser for denne container",
    settings_badge_protected: "beskyttet",
    settings_badge_excluded: "ekskluderet",

    toggle_protect: "Beskyt",
    toggle_unprotect: "Fjern beskyttelse",
    toggle_exclude: "Ekskluder",

    groups_title: "Grupper",
    groups_desc: "Organiser containere i mapper. En container kan kun tilhøre én gruppe.",
    groups_create: "Opret gruppe",
    groups_name_label: "Gruppenavn",
    groups_name_placeholder: "f.eks. sharedrive",
    groups_color_label: "Farve",
    groups_empty: "Ingen grupper endnu. Opret én ovenfor.",
    groups_rename_tip: "Omdøb",
    groups_delete_tip: "Slet gruppe",
    groups_delete_confirm: "Slet?",
    groups_delete_yes: "Ja",
    groups_delete_no: "Nej",

    detail_not_found: "Container ikke fundet.",
    detail_logs: "Logs",
    detail_protected_msg: "Beskyttet — handlinger deaktiveret",
    detail_badge_update: "opdatering tilgængelig",
    detail_section_status: "Status",
    detail_section_image: "Image",
    detail_section_network: "Netværk",
    detail_section_mounts: "Monteringer",
    detail_section_settings: "Dashboard-indstillinger",
    detail_section_events: (n) => `Hændelser (${n})`,
    detail_section_backups: (n) => `Sikkerhedskopier (${n})`,
    detail_no_events: "Ingen hændelser endnu",
    detail_no_backups: "Ingen sikkerhedskopier endnu",
    detail_setting_protected_label: "Beskyttet",
    detail_setting_protected_desc: "Deaktiverer start / stop / genstart / opdatering",
    detail_setting_excluded_label: "Ekskluderet",
    detail_setting_excluded_desc: "Skjuler container fra dashboardet",
    detail_via_label: "(via label)",
    detail_confirm_title: (label) => `${label} container?`,
    detail_confirm_desc: (label, name) => `Er du sikker på at du vil ${label.toLowerCase()} "${name}"?`,
    info_status: "Status",
    info_health: "Helbred",
    info_uptime: "Oppetid",
    info_restart_policy: "Genstart-politik",
    info_hostname: "Værtsnavn",
    info_image: "Image",
    info_image_id: "Image ID",
    info_update_status: "Opdateringsstatus",
    info_network: "Netværk",
    info_ip: "IP",
    info_mac: "MAC",
    info_network_mode: "Netværkstilstand",

    chart_stats_header: "Statistik (24t)",
    chart_cpu_label: "cpu",
    chart_cpu_tip: "CPU — Procentdel af CPU-tid containeren bruger. Høj CPU kan betyde tung beregning eller en hængt proces.",
    chart_memory_label: "hukommelse",
    chart_memory_tip: "Memory — RAM-forbrug i MB. Viser hvor meget hukommelse containeren har allokeret og bruger.",
    chart_network_label: "netværk",
    chart_network_tip: "Network — Netværkstrafik (RX = modtaget, TX = sendt). Nyttigt til at se båndbreddeforbrug og aktivitet.",
    chart_block_label: "disk",
    chart_block_tip: "Block I/O — Disk-læsning og skrivning. Høj block I/O kan indikere tung databaseaktivitet eller filoperationer.",
    chart_live_cpu: "CPU",
    chart_live_ram: "RAM",
    chart_live_rx: "RX",
    chart_live_tx: "TX",
  },
};

export function useLang() {
  const lang = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const t = translations[lang];
  return { t, lang, setLanguage };
}
