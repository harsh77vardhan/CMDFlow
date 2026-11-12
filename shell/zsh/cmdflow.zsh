# CMDFlow initialization template for Zsh

__cmdflow_run() {
    local directive_file="$(mktemp -t cmdflow.XXXXXX 2>/dev/null || mktemp)"
    cmdflow __run zsh --directive-file "$directive_file" -- "$@"
    local exit_code=$?
    if [[ -f "$directive_file" ]]; then
        eval "$(<"$directive_file")"
        rm -f "$directive_file"
    fi
    return $exit_code
}

cmdflow() {
    case "$1" in
        alias|project|flow|context|profile)
            command cmdflow "$@"
            eval "$(cmdflow init zsh)"
            ;;
        *)
            command cmdflow "$@"
            ;;
    esac
}

cf() { cmdflow "$@"; }
flow() { cmdflow "$@"; }
