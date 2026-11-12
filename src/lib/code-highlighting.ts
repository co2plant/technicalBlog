import Prism from "prismjs";
import "prismjs/components/prism-java";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";
import "prismjs/components/prism-json";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-groovy";
import "prismjs/components/prism-python";

// Editor plugins and the Markdown renderer own highlighting, rather than Prism's DOM scanner.
export const prism = Object.assign(Prism, { manual: true });
