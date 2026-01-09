import { describe, it, expect } from 'vitest'
import { parseCSVLine, parseCSV, parseNumericCSV } from '../../src/helpers.js'

describe('parseCSVLine', () => {
  it('parses simple comma-separated values', () => {
    expect(parseCSVLine('a,b,c')).toEqual(['a', 'b', 'c'])
  })

  it('handles quoted fields with commas', () => {
    expect(parseCSVLine('a,"b,c",d')).toEqual(['a', 'b,c', 'd'])
  })

  it('trims whitespace', () => {
    expect(parseCSVLine(' a , b , c ')).toEqual(['a', 'b', 'c'])
  })

  it('handles empty fields', () => {
    expect(parseCSVLine('a,,c')).toEqual(['a', '', 'c'])
  })

  it('handles single value', () => {
    expect(parseCSVLine('hello')).toEqual(['hello'])
  })

  it('handles empty string', () => {
    expect(parseCSVLine('')).toEqual([''])
  })
})

describe('parseCSV', () => {
  it('parses CSV with headers', () => {
    const csv = 'name,age\nAlice,30\nBob,25'
    const result = parseCSV(csv)
    expect(result).toEqual([
      { name: 'Alice', age: '30' },
      { name: 'Bob', age: '25' },
    ])
  })

  it('skips empty lines', () => {
    const csv = 'name,age\nAlice,30\n\nBob,25\n'
    const result = parseCSV(csv)
    expect(result).toHaveLength(2)
  })

  it('handles quoted fields', () => {
    const csv = 'address,city\n"123 Main St, Apt 4",SF'
    const result = parseCSV(csv)
    expect(result[0].address).toBe('123 Main St, Apt 4')
  })

  it('handles missing values', () => {
    const csv = 'a,b,c\n1,,3'
    const result = parseCSV(csv)
    expect(result[0]).toEqual({ a: '1', b: '', c: '3' })
  })
})

describe('parseNumericCSV', () => {
  it('converts values to numbers', () => {
    const csv = 'BlockLot,Height_Ft,Area_1000\n123,65,5.5'
    const result = parseNumericCSV(csv)
    expect(result[0].Height_Ft).toBe(65)
    expect(result[0].Area_1000).toBe(5.5)
  })

  it('preserves BlockLot as string', () => {
    const csv = 'BlockLot,Height_Ft\n0012345,65'
    const result = parseNumericCSV(csv)
    expect(result[0].BlockLot).toBe('0012345')
  })

  it('converts non-numeric values to 0', () => {
    const csv = 'BlockLot,Height_Ft\n123,invalid'
    const result = parseNumericCSV(csv)
    expect(result[0].Height_Ft).toBe(0)
  })

  it('handles empty values as 0', () => {
    const csv = 'BlockLot,Height_Ft\n123,'
    const result = parseNumericCSV(csv)
    expect(result[0].Height_Ft).toBe(0)
  })
})
