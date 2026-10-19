export function getRouteQueryParam(name: string) {
    const params = new URLSearchParams(window.location.hash.split("?")[1] || "");
    return params.get(name) || "";
}
