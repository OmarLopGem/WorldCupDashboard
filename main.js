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
        .attr("viewBox", `0 0 ${width} ${height}`);
}

function drawPointsChart(data) {
    const width = 540;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 95, left: 45 };

    const svg = createSvg("#points-chart", width, height);
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
        .domain(data.map(d => d.team))
        .range([0, innerWidth])
        .padding(0.2);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.points)])
        .range([innerHeight, 0]);

    chart.append("g")
        .attr("class", "grid")
        .call(d3.axisLeft(yScale).tickSize(-innerWidth).tickFormat(""));

    const bars = chart.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("class", "interactive-shape")
        .attr("x", d => xScale(d.team))
        .attr("y", d => yScale(d.points))
        .attr("width", xScale.bandwidth())
        .attr("height", d => innerHeight - yScale(d.points))
        .attr("fill", d => getGroupColor(d.group));

    chart.selectAll(".chart-label")
        .data(data)
        .join("text")
        .attr("class", "chart-label")
        .attr("x", d => xScale(d.team) + xScale.bandwidth() / 2)
        .attr("y", d => yScale(d.points) - 6)
        .attr("text-anchor", "middle")
        .text(d => d.points);

    bars.on("mouseenter", function(event, d) {
        d3.select(this)
            .transition()
            .duration(150)
            .attr("fill", d3.color(getGroupColor(d.group)).darker(0.5));
    }).on("mouseleave", function(event, d) {
        d3.select(this)
            .transition()
            .duration(150)
            .attr("fill", getGroupColor(d.group));
    });

    chart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale))
        .selectAll("text")
        .attr("transform", "rotate(-35)")
        .style("text-anchor", "end");

    chart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale).ticks(6));
}

function drawGoalsChart(data) {
    const width = 540;
    const height = 320;
    const radius = 95;

    const svg = createSvg("#goals-chart", width, height);
    const chart = svg.append("g")
        .attr("transform", `translate(${180},${height / 2})`);

    const pie = d3.pie()
        .sort(null)
        .value(d => d.goalsFor);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const labelArc = d3.arc()
        .innerRadius(radius + 18)
        .outerRadius(radius + 18);

    const arcs = pie(data);

    const slices = chart.selectAll("path")
        .data(arcs)
        .join("path")
        .attr("class", "interactive-shape")
        .attr("d", arc)
        .attr("fill", d => getGroupColor(d.data.group));

    chart.selectAll(".pie-label")
        .data(arcs)
        .join("text")
        .attr("class", "pie-label")
        .attr("transform", d => `translate(${labelArc.centroid(d)})`)
        .attr("text-anchor", "middle")
        .text(d => `${d.data.team} (${d.data.goalsFor})`);

    slices.on("mouseenter", function(event, d) {
        const [x, y] = arc.centroid(d);
        const length = Math.sqrt((x * x) + (y * y)) || 1;
        const offsetX = (x / length) * 10;
        const offsetY = (y / length) * 10;

        d3.select(this)
            .transition()
            .duration(150)
            .attr("fill", d3.color(getGroupColor(d.data.group)).darker(0.5))
            .attr("transform", `translate(${offsetX},${offsetY})`);
    }).on("mouseleave", function(event, d) {
        d3.select(this)
            .transition()
            .duration(150)
            .attr("fill", getGroupColor(d.data.group))
            .attr("transform", "translate(0,0)");
    });

    const legend = svg.append("g")
        .attr("transform", "translate(340,55)");

    const legendRows = legend.selectAll("g")
        .data(data)
        .join("g")
        .attr("transform", (_, i) => `translate(0,${i * 24})`);

    legendRows.append("rect")
        .attr("width", 14)
        .attr("height", 14)
        .attr("fill", d => getGroupColor(d.group));

    legendRows.append("text")
        .attr("class", "chart-label")
        .attr("x", 22)
        .attr("y", 11)
        .text(d => `${d.team} - ${d.goalsFor}`);
}

function drawGoalDiffChart(data) {
    const width = 1120;
    const height = 320;
    const margin = { top: 20, right: 20, bottom: 20, left: 110 };

    const svg = createSvg("#diff-chart", width, height);
    const chart = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.goalDiff)])
        .range([0, innerWidth]);

    const yScale = d3.scaleBand()
        .domain(data.map(d => d.team))
        .range([0, innerHeight])
        .padding(0.2);

    chart.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).tickSize(-innerHeight).tickFormat(""));

    const bars = chart.selectAll("rect")
        .data(data)
        .join("rect")
        .attr("class", "interactive-shape")
        .attr("x", 0)
        .attr("y", d => yScale(d.team))
        .attr("width", d => xScale(d.goalDiff))
        .attr("height", yScale.bandwidth())
        .attr("fill", d => getGroupColor(d.group));

    chart.selectAll(".chart-label")
        .data(data)
        .join("text")
        .attr("class", "chart-label")
        .attr("x", d => xScale(d.goalDiff) + 6)
        .attr("y", d => yScale(d.team) + yScale.bandwidth() / 2 + 4)
        .text(d => `+${d.goalDiff}`);

    bars.on("mouseenter", function(event, d) {
        d3.select(this)
            .transition()
            .duration(150)
            .attr("fill", d3.color(getGroupColor(d.group)).darker(0.5));
    }).on("mouseleave", function(event, d) {
        d3.select(this)
            .transition()
            .duration(150)
            .attr("fill", getGroupColor(d.group));
    }).on("click", function() {
        d3.select(this)
            .transition()
            .duration(120)
            .attr("opacity", 0.6)
            .transition()
            .duration(120)
            .attr("opacity", 1);
    });

    chart.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale));

    chart.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(xScale).ticks(6));
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
            goalDiff: d.goalsDiff
        }));

    const pointsData = [...standings]
        .sort((a, b) => b.points - a.points || d3.ascending(a.team, b.team))
        .slice(0, 10);

    const goalsData = [...standings]
        .sort((a, b) => b.goalsFor - a.goalsFor || d3.ascending(a.team, b.team))
        .slice(0, 10);

    const diffData = [...standings]
        .sort((a, b) => b.goalDiff - a.goalDiff || d3.ascending(a.team, b.team))
        .slice(0, 10);

    drawPointsChart(pointsData);
    drawGoalsChart(goalsData);
    drawGoalDiffChart(diffData);
}

init().catch(error => {
    console.error("Error loading World Cup data:", error);
});
