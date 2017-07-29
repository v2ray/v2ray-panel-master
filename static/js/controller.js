function format_traffic(v) {
    var units = ["B", "K", "M", "G", "T"];
    var current = 0;
    v = parseInt(v);

    while(v >= 1024) {
        current++;
        v /= 1024;
    }

    return v.toFixed(2) + " " + units[current];
}

function format_all_traffic_data() {
    $(".traffic-data").each(function(id, v) {
        v.innerHTML = format_traffic(v.innerHTML);
    });
}