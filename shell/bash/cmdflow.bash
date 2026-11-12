# CMDFlow initialization template for Bash

__cmdflow_run() {
    local directive_file
    directive_file="$(mktemp -t cmdflow.XXXXXX 2>/dev/null || mktemp)"
    cmdflow __run bash --directive-file "$directive_file" -- "$@"
    local exit_code=$?
    if [ -f "$directive_file" ]; then
        eval "$(cat "$directive_file")"
        rm -f "$directive_file"
    fi
    return $exit_code
}

cmdflow() {
    case "$1" in
        alias|project|flow|context|profile)
            command cmdflow "$@"
            eval "$(cmdflow init bash)"
            ;;
        *)
            command cmdflow "$@"
            ;;
    esac
}

cf() { cmdflow "$@"; }
flow() { cmdflow "$@"; }
