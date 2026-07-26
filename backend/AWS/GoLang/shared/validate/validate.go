package validate

import "regexp"

var (
	EmailRe        = regexp.MustCompile(`^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,})+$`)
	EthAddressRe   = regexp.MustCompile(`^0x[a-fA-F0-9]{40}$`)
	PropertyIDRe   = regexp.MustCompile(`^[a-fA-F0-9]{24}$`)
)
