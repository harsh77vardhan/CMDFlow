# CMDFlow initialization template for Fish

function __cmdflow_run
    set -l directive_file (mktemp -t cmdflow.XXXXXX 2>/dev/null; or mktemp)
    cmdflow __run fish --directive-file "$directive_file" -- $argv
    set -l exit_code $status
    if test -f "$directive_file"
        source "$directive_file"
        rm -f "$directive_file"
    end
    return $exit_code
end

function cmdflow --wraps cmdflow
    switch $argv[1]
        case alias project flow context profile
            command cmdflow $argv
            eval (cmdflow init fish | string collect)
        case '*'
            command cmdflow $argv
    end
end

function cf --wraps cmdflow; cmdflow $argv; end
function flow --wraps cmdflow; cmdflow $argv; end
