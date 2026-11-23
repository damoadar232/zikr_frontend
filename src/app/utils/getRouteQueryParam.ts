export function getRouteQueryParam(name: string) {
    const search = window.location.search || window.location.hash.split("?")[1] || "";
    const params = new URLSearchParams(search);
    return params.get(name) || "";
}
