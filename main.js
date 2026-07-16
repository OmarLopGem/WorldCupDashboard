const API_KEY = "6b5898c8b341ad9a7d06992b07af2942";
const BASE_LINK = "https://v3.football.api-sports.io";
const GROUP_COLORS = {
    "Group A": "#c1272d",
    "Group B": "#ff7a1a",
    "Group C": "#f4b400",
    "Group D": "#ffd166",
    "Group E": "#00a896",
    "Group F": "#169b45",
    "Group G": "#1d4ed8",
    "Group H": "#7c3aed"
};

async function apiGet(path) {
    const res = await fetch(`${BASE_LINK}${path}`, {
        headers: {
            "x-apisports-key": API_KEY
        }
    });

    if (!res.ok) {
        throw new Error(`API request failed with status ${res.status}`);
    }

    return res.json();
}
function getGroupColor(groupName) {
    return GROUP_COLORS[groupName] || "#318ec0";
}

function createSvg(containerSelector, width, height) {
    d3.select(containerSelector).selectAll("*").remove();

    return d3.select(containerSelector)
        .append("svg")
        .attr("class", "chart-svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .attr("preserveAspectRatio", "xMidYMid meet");
}

function drawPointsChart(data) {
    const width = 760;
    const height = 380;
    const margin = { top: 30, right: 18, bottom: 110, left: 54 };

    const svg = createSvg("#points-chart", width, height);
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .domain(data.map(d => d.team))
        .range([0, innerWidth])
        .padding(0.18);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.points)])
        .nice()
        .range([innerHeight, 0]);

    chart.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));

    const bars = chart.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "interactive-shape")
        .attr("x", d => x(d.team))
        .attr("y", d => y(d.points))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.points))
        .attr("fill", d => getGroupColor(d.group));

    chart.selectAll(".chart-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "chart-label")
        .attr("x", d => x(d.team) + x.bandwidth() / 2)
        .attr("y", d => y(d.points) - 8)
        .attr("text-anchor", "middle")
        .text(d => d.points);

    bars.on("mouseenter", function(event, d) {
        d3.select(this)
            .raise()
            .transition()
            .duration(180)
            .attr("fill", d3.color(getGroupColor(d.group)).darker(0.45))
            .attr("y", y(d.points) - 8)
            .attr("height", innerHeight - y(d.points) + 8);
    }).on("mouseleave", function(event, d) {
        d3.select(this)
            .transition()
            .duration(180)
            .attr("fill", getGroupColor(d.group))
            .attr("y", y(d.points))
            .attr("height", innerHeight - y(d.points));
    });

    chart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "rotate(-40)")
        .style("text-anchor", "end");

    chart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y).ticks(8));
}

function drawGoalsChart(data) {
    const width = 760;
    const height = 380;
    const radius = 120;

    const svg = createSvg("#goals-chart", width, height);
    const chart = svg.append("g")
        .attr("transform", `translate(${width / 2 - 90},${height / 2})`);

    const pie = d3.pie()
        .sort(null)
        .value(d => d.goalsFor);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const labelArc = d3.arc()
        .innerRadius(radius * 1.12)
        .outerRadius(radius * 1.12);

    const arcs = pie(data);
    const totalGoals = d3.sum(data, d => d.goalsFor);

    const slices = chart.selectAll("path")
        .data(arcs)
        .enter()
        .append("path")
        .attr("class", "interactive-shape")
        .attr("d", arc)
        .attr("fill", d => getGroupColor(d.data.group))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 2);

    chart.selectAll(".pie-label")
        .data(arcs)
        .enter()
        .append("text")
        .attr("class", "pie-label")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", d => (labelArc.centroid(d)[0] >= 0 ? "start" : "end"))
        .text(d => d.data.team);

    chart.selectAll(".pie-value")
        .data(arcs)
        .enter()
        .append("text")
        .attr("class", "pie-value")
        .attr("transform", d => {
            const [x, y] = labelArc.centroid(d);
            return `translate(${x},${y + 14})`;
        })
        .attr("text-anchor", d => (labelArc.centroid(d)[0] >= 0 ? "start" : "end"))
        .text(d => `${d.data.goalsFor} goals (${Math.round((d.data.goalsFor / totalGoals) * 100)}%)`);

    const legend = svg.append("g")
        .attr("transform", "translate(500,70)");

    const legendRow = legend.selectAll(".legend-row")
        .data(data)
        .enter()
        .append("g")
        .attr("transform", (_, i) => `translate(0,${i * 28})`);

    legendRow.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("rx", 4)
        .attr("fill", d => getGroupColor(d.group));

    legendRow.append("text")
        .attr("class", "chart-label")
        .attr("x", 22)
        .attr("y", 11)
        .text(d => `${d.team} - ${d.goalsFor}`);

    slices.on("mouseenter", function(event, d) {
        const [cx, cy] = arc.centroid(d);
        const length = Math.sqrt((cx * cx) + (cy * cy)) || 1;
        const offsetX = (cx / length) * 12;
        const offsetY = (cy / length) * 12;

        d3.select(this)
            .raise()
            .transition()
            .duration(180)
            .attr("transform", `translate(${offsetX},${offsetY})`)
            .attr("stroke-width", 4);
    }).on("mouseleave", function() {
        d3.select(this)
            .transition()
            .duration(180)
            .attr("transform", "translate(0,0)")
            .attr("stroke-width", 2);
    });
}

async function init() {
    const standingsRaw = await apiGet("/standings?league=1&season=2022");

    const standings = standingsRaw.response[0].league.standings
        .flat()
        .map(d => ({
            group: d.group,
            team: d.team.name,
            points: d.points,
            goalsFor: d.all.goals.for,
            goalsAgainst: d.all.goals.against,
            goalDiff: d.goalsDiff
        }));

    const pointsData = [...standings]
        .sort((a, b) => b.points - a.points || b.goalDiff - a.goalDiff || d3.ascending(a.team, b.team))
        .slice(0, 12);

    const goalShareData = [...standings]
        .sort((a, b) => b.goalsFor - a.goalsFor || b.points - a.points || d3.ascending(a.team, b.team))
        .slice(0, 6);

    const goalDiffData = [...standings]
        .sort((a, b) => b.goalDiff - a.goalDiff || b.goalsFor - a.goalsFor || d3.ascending(a.team, b.team))
        .slice(0, 10)
        .reverse();

    drawPointsChart(pointsData);
    drawGoalsChart(goalShareData);
    drawGoalDiffChart(goalDiffData);
}

init().catch(error => {
    console.error("Error loading World Cup data:", error);
});

function drawGoalDiffChart(data) {
    const width = 980;
    const height = 400;
    const margin = { top: 28, right: 32, bottom: 36, left: 130 };

    const svg = createSvg("#diff-chart", width, height);
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.goalDiff)])
        .nice()
        .range([0, innerWidth]);

    const y = d3.scaleBand()
        .domain(data.map(d => d.team))
        .range([innerHeight, 0])
        .padding(0.2);

    chart.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).tickSize(-innerHeight).tickFormat(""));

    const bars = chart.selectAll("rect")
        .data(data)
        .enter()
        .append("rect")
        .attr("class", "interactive-shape")
        .attr("x", 0)
        .attr("y", d => y(d.team))
        .attr("width", d => x(d.goalDiff))
        .attr("height", y.bandwidth())
        .attr("rx", 8)
        .attr("fill", d => getGroupColor(d.group));

    chart.selectAll(".chart-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "chart-label")
        .attr("x", d => x(d.goalDiff) + 8)
        .attr("y", d => y(d.team) + y.bandwidth() / 2 + 4)
        .text(d => `+${d.goalDiff}`);

    bars.on("mouseenter", function(event, d) {
        d3.select(this)
            .raise()
            .transition()
            .duration(180)
            .attr("fill", d3.color(getGroupColor(d.group)).darker(0.45))
            .attr("width", x(d.goalDiff) + 12);
    }).on("mouseleave", function(event, d) {
        d3.select(this)
            .transition()
            .duration(180)
            .attr("fill", getGroupColor(d.group))
            .attr("width", x(d.goalDiff));
    }).on("click", function(event, d) {
        d3.select(this)
            .transition()
            .duration(160)
            .attr("opacity", 0.65)
            .transition()
            .duration(160)
            .attr("opacity", 1);
    });

    chart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y));

    chart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(6));
}
